/**
 * Directory-Based Labeler: リポジトリ経由（GitHub API）の設定ローダーのユニットテスト
 *
 * `pull_request_target` で信頼済みの ref からポリシーを読むための経路。ローカル FS 経路と
 * 「未存在」セマンティクスが一致していることが呼び出し側のフォールバック契約になる。
 */

import { getOctokit } from '@actions/github';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { loadDirectoryLabelerConfigFromRepository } from '../../src/directory-labeler/config-loader.js';
import { initializeI18n, resetI18n } from '../../src/i18n.js';

vi.mock('@actions/github', () => ({
  getOctokit: vi.fn(),
}));

vi.mock('@actions/core', () => ({
  info: vi.fn(),
  warning: vi.fn(),
  debug: vi.fn(),
  error: vi.fn(),
}));

const VALID_CONFIG = `
version: 1
rules:
  - label: "area:components"
    include:
      - "src/components/**"
`;

/**
 * YAML アンカー/エイリアスの許可は directory-labeler 固有の契約（pr-labeler 側の JSON_SCHEMA
 * パーサでは通らない）。ローカル FS 経路と同じスキーマで読めることを固定する。
 */
const ANCHOR_CONFIG = `
version: 1
shared: &shared_include
  - "src/shared/**"
rules:
  - label: "area:base"
    include: *shared_include
  - label: "area:extended"
    include: *shared_include
`;

function base64(content: string): string {
  return Buffer.from(content, 'utf-8').toString('base64');
}

describe('loadDirectoryLabelerConfigFromRepository', () => {
  let getContent: ReturnType<typeof vi.fn>;

  const params = {
    token: 'token',
    owner: 'octo',
    repo: 'repo',
    configPath: '.github/directory-labeler.yml',
    ref: 'base-sha',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    resetI18n();
    initializeI18n('en');

    getContent = vi.fn().mockResolvedValue({ data: { content: base64(VALID_CONFIG) } });
    vi.mocked(getOctokit).mockReturnValue({
      rest: { repos: { getContent } },
    } as unknown as ReturnType<typeof getOctokit>);
  });

  it('リポジトリの指定 ref から設定を読み込み、デフォルト値を適用する', async () => {
    const result = await loadDirectoryLabelerConfigFromRepository(params);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.rules[0]?.label).toBe('area:components');
      expect(result.value.options).toEqual({ dot: true, nocase: false, matchBase: false });
      expect(result.value.useDefaultExcludes).toBe(true);
    }
    expect(getContent).toHaveBeenCalledWith(
      expect.objectContaining({
        owner: 'octo',
        repo: 'repo',
        path: '.github/directory-labeler.yml',
        ref: 'base-sha',
      }),
    );
  });

  it('ref を省略した場合はデフォルトブランチを読む（ref を送らない）', async () => {
    const { ref: _ref, ...withoutRef } = params;

    const result = await loadDirectoryLabelerConfigFromRepository(withoutRef);

    expect(result.isOk()).toBe(true);
    expect(getContent).toHaveBeenCalledWith(expect.not.objectContaining({ ref: expect.anything() }));
  });

  it('YAML アンカー/エイリアスを許可する', async () => {
    getContent.mockResolvedValue({ data: { content: base64(ANCHOR_CONFIG) } });

    const result = await loadDirectoryLabelerConfigFromRepository(params);

    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value.rules).toHaveLength(2);
      expect(result.value.rules[1]?.label).toBe('area:extended');
      expect(result.value.rules[1]?.include).toEqual(['src/shared/**']);
    }
  });

  it('404 は未存在（FileSystemError）として扱い、ローカル FS 経路と同じ意味にする', async () => {
    getContent.mockRejectedValue(Object.assign(new Error('Not Found'), { status: 404 }));

    const result = await loadDirectoryLabelerConfigFromRepository(params);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.type).toBe('FileSystemError');
    }
  });

  it('404 以外の取得失敗は未存在扱いにせず ConfigurationError を返す', async () => {
    getContent.mockRejectedValue(Object.assign(new Error('boom'), { status: 500 }));

    const result = await loadDirectoryLabelerConfigFromRepository(params);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.type).toBe('ConfigurationError');
    }
  });

  it('スキーマ検証に失敗した設定は ConfigurationError を返す', async () => {
    getContent.mockResolvedValue({ data: { content: base64('version: 2\nrules: []\n') } });

    const result = await loadDirectoryLabelerConfigFromRepository(params);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.type).toBe('ConfigurationError');
    }
  });

  it('YAML パースエラーは ConfigurationError を返す', async () => {
    getContent.mockResolvedValue({ data: { content: base64('version: 1\nrules: [\n') } });

    const result = await loadDirectoryLabelerConfigFromRepository(params);

    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.type).toBe('ConfigurationError');
    }
  });
});
