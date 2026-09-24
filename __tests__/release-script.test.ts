/**
 * Regression tests for the commit classification logic in
 * scripts/release.sh. The prefix -> section mapping is defined in
 * .github/RELEASE_TEMPLATE.md; these tests pin the shell implementation
 * to that contract by exercising the real functions (sourced, not
 * reimplemented) against a disposable git repository.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

const SCRIPT_PATH = resolve(__dirname, '../scripts/release.sh');

// git hooks export GIT_DIR etc.; inherited, they point fixture git calls at the real repo.
function fixtureEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (!key.startsWith('GIT_')) {
      env[key] = value;
    }
  }
  env.GIT_AUTHOR_NAME = 'Test';
  env.GIT_AUTHOR_EMAIL = 'test@example.com';
  env.GIT_COMMITTER_NAME = 'Test';
  env.GIT_COMMITTER_EMAIL = 'test@example.com';
  return env;
}

function git(cwd: string, args: string[]): void {
  execFileSync('git', args, { cwd, env: fixtureEnv(), stdio: 'ignore' });
}

function commit(cwd: string, message: string): void {
  git(cwd, ['commit', '--allow-empty', '-m', message]);
}

function runShellFunction(cwd: string, fn: string, args: string[]): string {
  const quotedArgs = args.map(arg => `'${arg.replace(/'/g, `'\\''`)}'`).join(' ');
  return execFileSync('bash', ['-c', `set -euo pipefail; source '${SCRIPT_PATH}'; ${fn} ${quotedArgs}`], {
    cwd,
    env: fixtureEnv(),
    encoding: 'utf8',
  });
}

// Returns the `- ...` bullet lines directly under a `##`/`###` heading, i.e.
// before the next heading or end of output.
function sectionLines(output: string, heading: string): string[] {
  const lines = output.split('\n');
  const start = lines.indexOf(heading);
  if (start === -1) {
    return [];
  }
  const result: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('### ') || line.startsWith('## ')) {
      break;
    }
    if (line.startsWith('- ')) {
      result.push(line);
    }
  }
  return result;
}

// Repo setup plus the two shell invocations below is much slower than an
// in-process assertion -- the default 5s timeout is too tight under a full
// `pnpm test` run. Individual `it`s only read the captured strings, so they
// don't need this.
const SHELL_SETUP_TIMEOUT_MS = 20000;

describe('scripts/release.sh commit classification', () => {
  let repoDir: string;
  // generate_changelog/detect_breaking_changes output for the fixed commit
  // set below is deterministic, so every `it` reads these once-computed
  // strings instead of re-running the (comparatively expensive) shell calls.
  let changelog: string;
  let breaking: string;

  beforeAll(() => {
    repoDir = mkdtempSync(join(tmpdir(), 'release-script-test-'));
    git(repoDir, ['init', '-q']);
    git(repoDir, ['config', 'user.email', 'test@example.com']);
    git(repoDir, ['config', 'user.name', 'Test']);

    commit(repoDir, 'base');
    git(repoDir, ['tag', 'base']);

    commit(repoDir, 'feat: add thing (#1)');
    commit(repoDir, 'fix(scope): repair (#2)');
    commit(repoDir, 'refactor: restructure (#3)');
    commit(repoDir, 'test: add case (#4)');
    commit(repoDir, 'ci: tweak (#5)');
    commit(repoDir, 'chore: bump deps (#6)');
    commit(repoDir, 'docs: update readme (#7)');
    commit(repoDir, 'Revert "fix: 何か" (#8)');
    commit(repoDir, 'Update docs: add section (#9)');
    commit(repoDir, "Merge branch 'x'");
    commit(repoDir, 'feat!: breaking thing (#10)');
    commit(repoDir, 'fix(security)!: secure it (#11)');
    // A commit that has both a BREAKING CHANGE: footer and a `!` subject
    // marker must not be counted twice.
    commit(repoDir, 'feat(api)!: dual marker (#12)\n\nBREAKING CHANGE: dual marker description');
    // A `!` commit with a multi-line body: only the subject line may reach
    // the Breaking Changes section, never the body.
    commit(
      repoDir,
      'fix(core)!: multiline subject (#13)\n\nThis body has several lines.\nSecond detail line.\nThird detail line.',
    );
    // A commit with two BREAKING CHANGE: footers: each must become its own
    // bullet, not get collapsed into one array entry with an unmarked
    // second line.
    commit(
      repoDir,
      'feat: two footers (#20)\n\nBREAKING CHANGE: first description\nBREAKING CHANGE: second description',
    );

    changelog = runShellFunction(repoDir, 'generate_changelog', ['base', 'HEAD']);
    breaking = runShellFunction(repoDir, 'detect_breaking_changes', ['base', 'HEAD']);
  }, SHELL_SETUP_TIMEOUT_MS);

  afterAll(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  it('classifies feat: as Added and fix: / fix(scope): as Fixed', () => {
    expect(sectionLines(changelog, '### ✨ Added')).toContain('- add thing (#1)');
    expect(sectionLines(changelog, '### 🐛 Fixed')).toContain('- repair (#2)');
  });

  it('classifies everything other than feat:/fix: as Changed, with no Other Changes bucket', () => {
    const changed = sectionLines(changelog, '### 🔄 Changed');
    expect(changed).toContain('- restructure (#3)');
    expect(changed).toContain('- add case (#4)');
    expect(changed).toContain('- tweak (#5)');
    expect(changed).toContain('- bump deps (#6)');
    expect(changed).toContain('- update readme (#7)');
    expect(changelog).not.toContain('Other Changes');
  });

  it('keeps the full text of non-Conventional-Commits subjects instead of truncating at a stray colon', () => {
    const changed = sectionLines(changelog, '### 🔄 Changed');
    expect(changed).toContain('- Revert "fix: 何か" (#8)');
    expect(changed).toContain('- Update docs: add section (#9)');
    expect(changed).toContain("- Merge branch 'x'");
  });

  it('classifies a scope-less feat!:/fix!: as Added/Fixed, not Changed', () => {
    expect(sectionLines(changelog, '### ✨ Added')).toContain('- breaking thing (#10)');
    expect(sectionLines(changelog, '### 🐛 Fixed')).toContain('- secure it (#11)');
  });

  it('preserves the (#N) PR reference on every generated entry', () => {
    for (const pr of ['(#1)', '(#2)', '(#3)', '(#5)', '(#6)', '(#7)']) {
      expect(changelog).toContain(pr);
    }
  });

  it('detects type(scope)!: as a breaking change, not only type!:(scope)', () => {
    expect(breaking).toContain('- breaking thing (#10)');
    expect(breaking).toContain('- secure it (#11)');
  });

  it('emits exactly one Breaking Changes entry for a commit with both a footer and a ! subject', () => {
    const dualMarkerLines = breaking.split('\n').filter(line => line.includes('dual marker'));
    expect(dualMarkerLines).toHaveLength(1);
    expect(dualMarkerLines[0]).toBe('- dual marker description');
  });

  it('lists only the subject line for a ! commit, never the commit body', () => {
    expect(breaking).toContain('- multiline subject (#13)');
    expect(breaking).not.toContain('This body has several lines');
    expect(breaking).not.toContain('Second detail line');
    expect(breaking).not.toContain('Third detail line');
  });

  it('gives each of several BREAKING CHANGE: footers on one commit its own bullet', () => {
    expect(breaking).toContain('- first description');
    expect(breaking).toContain('- second description');
    // The second footer must not be swallowed into the first line's bullet.
    expect(breaking).not.toContain('first description\nsecond description');
    expect(breaking).not.toMatch(/^second description$/m);
  });
});
