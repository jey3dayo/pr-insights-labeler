import { execFile } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { promisify } from 'node:util';

import * as github from '@actions/github';
import { err, ok, Result } from 'neverthrow';

import { logDebug } from '../actions-io.js';
import type { FileAnalysisError } from '../errors/index.js';
import { createFileAnalysisError, ensureError } from '../errors/index.js';
import type { RepoContext } from './types.js';

const execFileAsync = promisify(execFile);

type SizeProbe = () => Promise<number | undefined>;

async function runProbes(probes: SizeProbe[]): Promise<number | undefined> {
  for (const probe of probes) {
    const size = await probe();
    if (typeof size === 'number' && Number.isFinite(size)) {
      return size;
    }
  }
  return undefined;
}

function createFsStatProbe(filePath: string): SizeProbe {
  return async () => {
    try {
      const stats = await fs.stat(filePath);
      if (stats.isFile()) {
        logDebug(`Got size from fs.stat: ${stats.size} bytes`);
        return stats.size;
      }
    } catch (error) {
      logDebug(`fs.stat failed: ${ensureError(error).message}`);
    }
    return undefined;
  };
}

function createGitLsTreeProbe(filePath: string): SizeProbe {
  return async () => {
    try {
      const { stdout } = await execFileAsync('git', ['ls-tree', '-l', 'HEAD', filePath]);
      const tabParts = stdout.trim().split('\t');
      if (tabParts.length >= 2 && tabParts[0]) {
        const metaParts = tabParts[0].trim().split(/\s+/);
        if (metaParts.length >= 4) {
          const size = parseInt(metaParts[3] || '', 10);
          if (!Number.isNaN(size)) {
            logDebug(`Got size from git ls-tree: ${size} bytes`);
            return size;
          }
        }
      }
    } catch (error) {
      logDebug(`git ls-tree failed: ${ensureError(error).message}`);
    }
    return undefined;
  };
}

function createGitHubApiProbe(filePath: string, token: string, context: RepoContext): SizeProbe {
  return async () => {
    try {
      const octokit = github.getOctokit(token);
      const response = await octokit.rest.repos.getContent({
        owner: context.owner,
        repo: context.repo,
        path: filePath,
        ...(context.headSha && { ref: context.headSha }),
      });

      if ('size' in response.data && response.data.type === 'file') {
        logDebug(`Got size from GitHub API: ${response.data.size} bytes`);
        return response.data.size;
      }
    } catch (error) {
      logDebug(`GitHub API failed: ${ensureError(error).message}`);
    }
    return undefined;
  };
}

export async function getFileSize(
  filePath: string,
  token: string,
  context: RepoContext,
): Promise<Result<number, FileAnalysisError>> {
  logDebug(`Getting size for file: ${filePath}`);

  const size = await runProbes([
    createFsStatProbe(filePath),
    createGitLsTreeProbe(filePath),
    createGitHubApiProbe(filePath, token, context),
  ]);

  if (typeof size === 'number') {
    return ok(size);
  }

  return err(createFileAnalysisError(filePath, 'Failed to get file size using all strategies'));
}
