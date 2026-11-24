import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import * as github from '@actions/github';
import { err, ok, Result } from 'neverthrow';

import { getEnvVar, logDebug, logInfo, logWarning } from './actions-io.js';
import type { DiffError } from './errors/index.js';
import { createDiffError, ensureError } from './errors/index.js';

const execFileAsync = promisify(execFile);

export interface DiffFile {
  filename: string;
  additions: number;
  deletions: number;
  status: 'added' | 'modified' | 'renamed' | 'copied';
}

export interface DiffResult {
  files: DiffFile[];
  strategy: 'local-git' | 'github-api';
}

export interface PullRequestContext {
  owner: string;
  repo: string;
  pullNumber: number;
  baseSha: string;
  headSha: string;
}

function parseGitDiffLine(line: string): DiffFile | null {
  const parts = line.trim().split('\t');
  if (parts.length !== 3) {
    return null;
  }

  const additions = parseInt(parts[0] ?? '', 10);
  const deletions = parseInt(parts[1] ?? '', 10);
  let filename = parts[2] ?? '';

  if (isNaN(additions) || isNaN(deletions) || !filename) {
    return null;
  }

  // Handle rename format: "path/{old => new}" -> "path/new"
  // Also handles: "{old => new}" -> "new"
  // Allows empty old name: "{ => new}" -> "new"
  const renameMatch = filename.match(/^(.*)\{(.*) => (.+)\}(.*)$/);
  if (renameMatch) {
    const prefix = renameMatch[1] ?? '';
    const newName = renameMatch[3] ?? '';
    const suffix = renameMatch[4] ?? '';
    filename = prefix + newName + suffix;
  }

  let status: DiffFile['status'];
  if (deletions === 0 && additions > 0) {
    status = 'added';
  } else if (additions === 0 && deletions === 0) {
    status = 'renamed';
  } else {
    status = 'modified';
  }

  return {
    filename,
    additions,
    deletions,
    status,
  };
}

async function getLocalGitDiff(context: PullRequestContext): Promise<Result<DiffFile[], DiffError>> {
  try {
    logDebug('Attempting to get diff using local git command');

    const { stdout, stderr } = await execFileAsync(
      'git',
      ['diff', '--numstat', '-M', '-C', '--diff-filter=ACMR', `${context.baseSha}...${context.headSha}`],
      {
        cwd: getEnvVar('GITHUB_WORKSPACE') || process.cwd(),
        maxBuffer: 16 * 1024 * 1024,
      },
    );

    if (stderr) {
      logWarning(`Git command stderr: ${stderr}`);
    }

    const lines = stdout
      .trim()
      .split('\n')
      .filter(line => line.length > 0);
    const files: DiffFile[] = [];

    for (const line of lines) {
      const file = parseGitDiffLine(line);
      if (file) {
        if (file.additions === 0 && file.deletions > 0) {
          continue;
        }
        files.push(file);
      }
    }

    logInfo(`Successfully retrieved ${files.length} files using local git`);
    return ok(files);
  } catch (error) {
    const message = ensureError(error).message;
    logWarning(`Local git diff failed: ${message}`);
    return err(createDiffError('local-git', `Failed to get local git diff: ${message}`));
  }
}

async function getGitHubAPIDiff(context: PullRequestContext, token: string): Promise<Result<DiffFile[], DiffError>> {
  try {
    logDebug('Attempting to get diff using GitHub API');

    const octokit = github.getOctokit(token);
    const files: DiffFile[] = [];
    let page = 1;
    const perPage = 100;

    while (true) {
      const response = await octokit.rest.pulls.listFiles({
        owner: context.owner,
        repo: context.repo,
        pull_number: context.pullNumber,
        per_page: perPage,
        page,
      });

      if (response.data.length === 0) {
        break;
      }

      for (const file of response.data) {
        if (file.status === 'removed') {
          continue;
        }

        let status: DiffFile['status'];
        switch (file.status) {
          case 'added':
            status = 'added';
            break;
          case 'renamed':
            status = 'renamed';
            break;
          case 'copied':
            status = 'copied';
            break;
          case 'modified':
          case 'changed':
          default:
            status = 'modified';
            break;
        }

        files.push({
          filename: file.filename,
          additions: file.additions,
          deletions: file.deletions,
          status,
        });
      }

      page++;

      if (page > 100) {
        logWarning('Pagination safety limit reached (100 pages)');
        break;
      }
    }

    logInfo(`Successfully retrieved ${files.length} files using GitHub API`);
    return ok(files);
  } catch (error) {
    const message = ensureError(error).message;
    logWarning(`GitHub API diff failed: ${message}`);
    return err(createDiffError('github-api', `Failed to get GitHub API diff: ${message}`));
  }
}

export async function getDiffFiles(context: PullRequestContext, token: string): Promise<Result<DiffResult, DiffError>> {
  const localResult = await getLocalGitDiff(context);
  if (localResult.isOk()) {
    return ok({
      files: localResult.value,
      strategy: 'local-git',
    });
  }

  logInfo('Falling back to GitHub API for diff retrieval');
  const apiResult = await getGitHubAPIDiff(context, token);
  if (apiResult.isOk()) {
    return ok({
      files: apiResult.value,
      strategy: 'github-api',
    });
  }

  return err(
    createDiffError(
      'both',
      `Failed to get diff files. Local git error: ${localResult.error.message}. API error: ${apiResult.error.message}`,
    ),
  );
}
