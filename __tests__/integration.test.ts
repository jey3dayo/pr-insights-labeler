import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import * as core from '@actions/core';
import * as github from '@actions/github';
import { okAsync } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { run } from '../src/index';
import type { ComplexityMetrics } from '../src/labeler-types';

// このテストは run() 全体を通す広い integration テストで、ラベル付与・違反判定・workflow の
// 成否を検証する場であり、実 ESLint の起動は不要（cold cache で数秒かかり、30s の testTimeout
// を1テストで大きく消費していた原因）。接合点は createComplexityAnalyzer()（利用元は
// src/workflow/stages/analysis.ts の1箇所のみ）で、@actions/github と同じ vi.mock の様式で
// 差し替え、実 ESLint 一式（eslint / @typescript-eslint/parser 等）をこのファイルの
// モジュールグラフから外す。これがコスト削減の実体で、cold cache 時間の大部分はモジュール
// import コストであって呼び出しコストではなかった。file-metrics 側（wc -l / fs.stat 等）は
// GITHUB_WORKSPACE ではなくプロセス cwd 基準でファイルを解決するため、各テストは beforeEach で
// 一時ディレクトリへ fixture ファイルを実在させてから process.chdir() し、afterEach で元の cwd
// へ戻して削除する（issue #167）。これにより filesAnalyzed が実際に埋まり、複雑度解析ブランチへ
// 到達する。実 ESLint との契約テストは __tests__/complexity-analyzer.test.ts に隔離済み。
// fixture が常にローカルへ存在するため getFileSize は第 1 プローブ（fs.stat）で必ず成功する。
// git ls-tree と GitHub API への fallback は __tests__/file-metrics.test.ts が検証しているので、
// ここへ到達しない getContent のサイズ応答モックを置かない。
const FAKE_COMPLEXITY_METRICS: ComplexityMetrics = {
  maxComplexity: 5,
  avgComplexity: 5,
  analyzedFiles: 1,
  files: [{ path: 'src/file.ts', complexity: 5, functions: [] }],
  skippedFiles: [],
  syntaxErrorFiles: [],
  truncated: false,
  hasTsconfig: false,
};

vi.mock('../src/complexity-analyzer', () => ({
  createComplexityAnalyzer: () => ({
    analyzeFile: vi.fn(),
    analyzeFiles: vi.fn(() => okAsync(FAKE_COMPLEXITY_METRICS)),
  }),
}));

// GitHub APIモック
const mockOctokit = {
  rest: {
    pulls: {
      listFiles: vi.fn(),
      get: vi.fn(),
    },
    issues: {
      addLabels: vi.fn(),
      removeLabel: vi.fn(),
      listLabelsOnIssue: vi.fn(),
      createComment: vi.fn(),
      updateComment: vi.fn(),
      listComments: vi.fn(),
    },
    repos: {
      getContent: vi.fn().mockRejectedValue({ status: 404, message: 'Not Found' }), // Default: config file not found
    },
  },
};

// diff-strategy の GitHub API フォールバックは `page` を進めながら空ページに到達するまで
// listFiles を呼び続ける。単純な mockResolvedValue は同じ1ページを返し続けてしまい、
// 実装側の安全弁（100ページ）に達するまでループしてしまう。fixture ファイルを実在させた後は
// そのループ1回ごとに実際の wc -l / fs.stat が走るため、ここで確実に1ページで終わらせる。
function mockListFilesSinglePage(data: unknown[]): void {
  mockOctokit.rest.pulls.listFiles.mockImplementation(async ({ page }: { page: number }) =>
    page === 1 ? { data } : { data: [] },
  );
}

vi.mock('@actions/github', () => ({
  context: {
    repo: { owner: 'test-owner', repo: 'test-repo' },
    issue: { number: 1 },
    payload: {
      pull_request: {
        number: 1,
        base: { sha: 'base-sha' },
        head: { sha: 'head-sha' },
        draft: false,
      },
    },
  },
  getOctokit: vi.fn(() => mockOctokit),
}));

// file-metrics 側（wc -l / fs.stat）が解決するファイル名は、このテストの mock が返す
// diff エントリの filename と一致させる必要がある。全テストで使うファイル名をここに列挙する。
const FIXTURE_FILENAMES = ['small.ts', 'large.ts', 'file.ts', 'feature.ts'];

describe('Integration Tests', () => {
  let summaryFile: string;
  let originalCwd: string;
  let fixtureDir: string;

  beforeEach(() => {
    vi.clearAllMocks();

    // fixture ファイルを一時ディレクトリに実在させ、そこへ chdir する。file-metrics は
    // GITHUB_WORKSPACE ではなくプロセス cwd 基準でファイルを解決するため、実リポジトリの
    // ファイルを参照せず、内容を自分で決めた既知の fixture で行数・サイズを決定的にする。
    originalCwd = process.cwd();
    fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pr-insights-labeler-integration-'));
    fs.mkdirSync(path.join(fixtureDir, 'src'), { recursive: true });
    const fixtureContent = 'export function sample(): number {\n  return 1;\n}\n';
    for (const name of FIXTURE_FILENAMES) {
      fs.writeFileSync(path.join(fixtureDir, 'src', name), fixtureContent);
    }
    process.chdir(fixtureDir);

    // 'should handle Draft PR correctly' が payload.pull_request を直接書き換えるため、
    // 共有オブジェクトの状態が後続テストへ漏れないよう毎回既定値へ戻す。
    vi.mocked(github.context).payload.pull_request = {
      number: 1,
      base: { sha: 'base-sha' },
      head: { sha: 'head-sha' },
      draft: false,
    };

    // GitHub Actions 環境変数をモック
    summaryFile = `/tmp/summary-${Date.now()}.md`;
    process.env['GITHUB_STEP_SUMMARY'] = summaryFile;
    process.env['GITHUB_TOKEN'] = 'mock-token';

    // サマリーファイルを作成
    fs.writeFileSync(summaryFile, '');

    // デフォルトの入力値を設定
    vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        github_token: 'mock-token',
        file_size_limit: '100KB',
        file_size_limit_enabled: 'true',
        file_lines_limit: '500',
        file_lines_limit_enabled: 'true',
        pr_additions_limit: '5000',
        pr_additions_limit_enabled: 'true',
        pr_files_limit: '50',
        pr_files_limit_enabled: 'true',
        apply_size_labels: 'true',
        size_label_thresholds:
          '{"S": {"additions": 100, "files": 10}, "M": {"additions": 500, "files": 30}, "L": {"additions": 1000, "files": 50}}',
        // Selective Label Enabling inputs (required for new API)
        size_enabled: 'true',
        size_thresholds: '{"small": 200, "medium": 500, "large": 1000, "xlarge": 3000}',
        complexity_enabled: 'true',
        complexity_thresholds: '{"medium": 10, "high": 20}',
        category_enabled: 'true',
        risk_enabled: 'true',
        // Directory Labeling inputs
        enable_directory_labeling: 'false',
        directory_labeler_config_path: '.github/directory-labeler.yml',
        auto_create_labels: 'false',
        label_color: 'cccccc',
        label_description: '',
        max_labels: '10',
        use_default_excludes: 'true',
        large_files_label: 'auto/large-files',
        too_many_files_label: 'auto/too-many-files',
        skip_draft_pr: 'true',
        comment_on_pr: 'auto',
        additional_exclude_patterns: '',
        enable_summary: 'true',
      };
      return inputs[name] || '';
    });

    vi.spyOn(core, 'setOutput').mockImplementation(() => {});
    vi.spyOn(core, 'setFailed').mockImplementation(() => {});
    vi.spyOn(core, 'info').mockImplementation(() => {});
    vi.spyOn(core, 'warning').mockImplementation(() => {});
    vi.spyOn(core, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    // サマリーファイルをクリーンアップ
    if (fs.existsSync(summaryFile)) {
      fs.unlinkSync(summaryFile);
    }

    // テストが失敗した場合でも cwd を元へ戻し、一時ディレクトリを削除する
    process.chdir(originalCwd);
    fs.rmSync(fixtureDir, { recursive: true, force: true });
  });

  describe('Basic Integration', () => {
    // run() 全体を通す最初のテストは、このファイルのモジュールグラフの Vite transform を
    // 初めて評価するコストを負う。issue #167 対応前は fixture ファイルが実在しないうえ、
    // GitHub API フォールバック用の pulls.listFiles モックが単純な mockResolvedValue で
    // ページ送りが終わらず、実装側の安全弁（100ページ）まで空振りのファイル解析を繰り返して
    // いた（cold cache 単独 3.4〜5.2s、`pnpm test` の lint 並列実行下では 5035ms で
    // タイムアウトすることもあった、issue #161）。fixture を実在させページを1回で終わらせる
    // ようにした結果、実測は cold cache でも 1s 未満（loadavg 16〜17 で 113ms、`pnpm test`
    // の lint 並列実行下でも 866ms）まで縮んだ。それでも高負荷時（loadavg 40 台）の揺れを
    // 吸収する余裕として明示 timeout は維持する。
    it('should run successfully with small PR', async () => {
      // 小規模PRのモック設定
      mockListFilesSinglePage([
        {
          filename: 'src/small.ts',
          additions: 50,
          deletions: 10,
          changes: 60,
          status: 'modified',
        },
      ]);

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [],
      });

      await run();

      // 成功で終了
      expect(core.setFailed).not.toHaveBeenCalled();

      // ラベルが適用される
      expect(mockOctokit.rest.issues.addLabels).toHaveBeenCalled();
      // `run()` 全体を通すためモジュールグラフが大きく、cold cache では transform が
      // 支配的になる。issue #167 対応（fixture 実在化 + ページネーション修正）後の実測は
      // cold cache で 113ms、`pnpm test`（lint と並列）でも 866ms と大幅に縮んだが、
      // このマシンは他プロセスの影響で loadavg が 40 台まで上がることがあるため、
      // この 1 本だけ余裕を持たせる。global の既定は 5s のままにして、他のテストには
      // 厳しい予算を残す。
    }, 30000);

    it('should handle Draft PR correctly', async () => {
      // Draft PRに設定
      vi.mocked(github.context).payload.pull_request = {
        number: 1,
        base: { sha: 'base-sha' },
        head: { sha: 'head-sha' },
        draft: true,
      };

      await run();

      // ファイル分析がスキップされる
      expect(mockOctokit.rest.pulls.listFiles).not.toHaveBeenCalled();

      // 成功で終了
      expect(core.setFailed).not.toHaveBeenCalled();
    });
  });

  describe('Violation Detection', () => {
    it('should complete successfully even with large PR', async () => {
      // 大規模ファイルを含むPR（統合テストはアクションが正常終了することを確認）
      mockListFilesSinglePage([
        {
          filename: 'src/large.ts',
          additions: 2000,
          deletions: 100,
          changes: 2100,
          status: 'modified',
        },
      ]);

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: [] });
      mockOctokit.rest.issues.createComment.mockResolvedValue({ data: {} });

      await run();

      // No failure conditions set, so should complete successfully
      expect(core.setFailed).not.toHaveBeenCalled();
    });
  });

  describe('Label Management', () => {
    it('should not duplicate labels', async () => {
      mockListFilesSinglePage([
        {
          filename: 'src/file.ts',
          additions: 100,
          deletions: 0,
          changes: 100,
          status: 'modified',
        },
      ]);

      // 既にラベルが存在
      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [{ name: 'size:S' }, { name: 'auto/excessive-changes' }],
      });

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [],
      });

      await run();

      // 既存ラベルと重複しないことを確認（冪等性）
      // addLabelsが呼ばれても、既存のラベルは含まれない
      const calls = mockOctokit.rest.issues.addLabels.mock.calls;
      if (calls.length > 0 && calls[0]?.[0]) {
        const addedLabels = calls[0][0].labels;
        expect(addedLabels).not.toContain('size:S');
      }
    });
  });

  describe('Output Variables', () => {
    it('should complete without errors', async () => {
      // 統合テスト: アクションが正常に完了することを確認
      mockListFilesSinglePage([
        {
          filename: 'src/file.ts',
          additions: 150,
          deletions: 50,
          changes: 200,
          status: 'modified',
        },
      ]);

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: [] });

      await run();

      // エラーなく完了することを確認
      expect(core.setFailed).not.toHaveBeenCalled();
    });
  });

  describe('Selective Label Enabling Integration', () => {
    beforeEach(() => {
      // PR Insights Labeler inputs を追加
      vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          github_token: 'mock-token',
          file_size_limit: '100KB',
          file_size_limit_enabled: 'true',
          file_lines_limit: '500',
          file_lines_limit_enabled: 'true',
          pr_additions_limit: '5000',
          pr_additions_limit_enabled: 'true',
          pr_files_limit: '50',
          pr_files_limit_enabled: 'true',
          large_files_label: 'auto/large-files',
          too_many_files_label: 'auto/too-many-files',
          skip_draft_pr: 'true',
          comment_on_pr: 'auto',
          additional_exclude_patterns: '',
          enable_summary: 'true',
          // Selective Label Enabling inputs
          size_enabled: 'true',
          size_thresholds: '{"small": 200, "medium": 500, "large": 1000, "xlarge": 3000}',
          complexity_enabled: 'true',
          complexity_thresholds: '{"medium": 10, "high": 20}',
          category_enabled: 'true',
          risk_enabled: 'true',
          // Directory Labeling inputs
          enable_directory_labeling: 'false',
          directory_labeler_config_path: '.github/directory-labeler.yml',
          auto_create_labels: 'false',
          label_color: 'cccccc',
          label_description: '',
          max_labels: '10',
          use_default_excludes: 'true',
        };
        return inputs[name] || '';
      });
    });

    it('should work with all label types enabled', async () => {
      mockListFilesSinglePage([
        {
          filename: 'src/feature.ts',
          additions: 150,
          deletions: 50,
          changes: 200,
          status: 'modified',
        },
      ]);

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: [] });

      await run();

      expect(core.setFailed).not.toHaveBeenCalled();
      // 個別*_enabledフラグ の場合はラベルが適用される可能性がある
      // ただし、すべての条件を満たす必要があるため、呼び出されるかどうかは実装に依存
    });

    it('should skip size labels when size_enabled=false', async () => {
      // サイズラベルを無効化
      vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          github_token: 'mock-token',
          file_size_limit: '100KB',
          file_size_limit_enabled: 'true',
          file_lines_limit: '500',
          file_lines_limit_enabled: 'true',
          pr_additions_limit: '5000',
          pr_additions_limit_enabled: 'true',
          pr_files_limit: '50',
          pr_files_limit_enabled: 'true',
          large_files_label: 'auto/large-files',
          too_many_files_label: 'auto/too-many-files',
          skip_draft_pr: 'true',
          comment_on_pr: 'auto',
          additional_exclude_patterns: '',
          enable_summary: 'true',
          size_enabled: 'false', // サイズラベルを無効化
          size_thresholds: '{"small": 200, "medium": 500, "large": 1000, "xlarge": 3000}',
          complexity_enabled: 'true',
          complexity_thresholds: '{"medium": 10, "high": 20}',
          category_enabled: 'true',
          risk_enabled: 'true',
          enable_directory_labeling: 'false',
          directory_labeler_config_path: '.github/directory-labeler.yml',
          auto_create_labels: 'false',
          label_color: 'cccccc',
          label_description: '',
          max_labels: '10',
          use_default_excludes: 'true',
        };
        return inputs[name] || '';
      });

      mockListFilesSinglePage([
        {
          filename: 'src/feature.ts',
          additions: 150,
          deletions: 50,
          changes: 200,
          status: 'modified',
        },
      ]);

      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.listComments.mockResolvedValue({
        data: [],
      });

      mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: [] });

      await run();

      expect(core.setFailed).not.toHaveBeenCalled();

      // サイズラベルが付与されないことを確認
      const calls = mockOctokit.rest.issues.addLabels.mock.calls;
      if (calls.length > 0 && calls[0]?.[0]) {
        const addedLabels = calls[0][0].labels as string[];
        const sizeLabels = addedLabels.filter(label => label.startsWith('size/'));
        expect(sizeLabels.length).toBe(0);
      }
    });
  });

  describe('Complexity Label Flow', () => {
    it('should carry the mocked complexity metrics through to the applied labels', async () => {
      vi.spyOn(core, 'getInput').mockImplementation((name: string) => {
        const inputs: Record<string, string> = {
          github_token: 'mock-token',
          file_size_limit: '100KB',
          file_size_limit_enabled: 'true',
          file_lines_limit: '500',
          file_lines_limit_enabled: 'true',
          pr_additions_limit: '5000',
          pr_additions_limit_enabled: 'true',
          pr_files_limit: '50',
          pr_files_limit_enabled: 'true',
          apply_size_labels: 'true',
          size_label_thresholds:
            '{"S": {"additions": 100, "files": 10}, "M": {"additions": 500, "files": 30}, "L": {"additions": 1000, "files": 50}}',
          size_enabled: 'true',
          size_thresholds: '{"small": 200, "medium": 500, "large": 1000, "xlarge": 3000}',
          complexity_enabled: 'true',
          // FAKE_COMPLEXITY_METRICS.maxComplexity は 5 固定。他のテストが使う
          // {"medium": 10, "high": 20} ではラベルが付かない値なので、このテストだけ
          // 閾値を下げて「モックした複雑度メトリクスがラベル決定へ流れる」ことを検証する。
          complexity_thresholds: '{"medium": 2, "high": 5}',
          category_enabled: 'true',
          risk_enabled: 'true',
          enable_directory_labeling: 'false',
          directory_labeler_config_path: '.github/directory-labeler.yml',
          auto_create_labels: 'false',
          label_color: 'cccccc',
          label_description: '',
          max_labels: '10',
          use_default_excludes: 'true',
          large_files_label: 'auto/large-files',
          too_many_files_label: 'auto/too-many-files',
          skip_draft_pr: 'true',
          comment_on_pr: 'auto',
          additional_exclude_patterns: '',
          enable_summary: 'true',
        };
        return inputs[name] || '';
      });

      mockListFilesSinglePage([
        {
          filename: 'src/file.ts',
          additions: 50,
          deletions: 10,
          changes: 60,
          status: 'modified',
        },
      ]);

      // vi.clearAllMocks() は呼び出し履歴だけを消し mock 実装は残すため、このテストが
      // 依存する「設定ファイルなし → デフォルト」の前提を明示的に固定する。
      mockOctokit.rest.repos.getContent.mockRejectedValue({ status: 404, message: 'Not Found' });
      mockOctokit.rest.issues.listLabelsOnIssue.mockResolvedValue({ data: [] });
      mockOctokit.rest.issues.listComments.mockResolvedValue({ data: [] });
      mockOctokit.rest.issues.addLabels.mockResolvedValue({ data: [] });

      await run();

      expect(core.setFailed).not.toHaveBeenCalled();

      // モックした複雑度メトリクス（maxComplexity: 5）がラベル決定エンジンまで流れ、
      // 実際に addLabels へ渡された引数に複雑度ラベルとして現れることを確認する。
      // 呼び出し回数ではなく、渡された引数の内容で assert する。complexityFiles は
      // filesAnalyzed から派生する（src/workflow/stages/analysis.ts）ため、このラベルが
      // 現れること自体が filesAnalyzed が空でなかった証明になる。
      const allAddedLabels: string[] = mockOctokit.rest.issues.addLabels.mock.calls.flatMap(
        call => call[0]?.labels ?? [],
      );
      expect(allAddedLabels).toContain('complexity/high');

      // 回帰ガード（issue #167）: fixture ファイルが再び不在に戻ると file-metrics 側の
      // 解析が全滅し、filesAnalyzed が空になって複雑度解析ブランチへ到達しなくなる。
      // その失敗は「Failed to analyze file」という警告として観測可能なので、
      // この警告が出ていないことで filesAnalyzed が空でなかったことも別経路で固定する。
      expect(core.warning).not.toHaveBeenCalledWith(expect.stringContaining('Failed to analyze file'));
    });
  });
});
