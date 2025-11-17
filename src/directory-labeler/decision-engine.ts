/**
 * Directory-Based Labeler: ラベル決定エンジン
 *
 * ファイルリストとConfigからラベルを決定するロジックを担当
 */

import * as core from '@actions/core';
import { ok, type Result } from 'neverthrow';

import { createPatternError } from '../errors/index.js';
import { normalizePath } from '../utils/path-utils.js';
import { compilePatterns, matchIncludePatterns } from './pattern-matcher.js';
import { DEFAULT_EXCLUDES, DEFAULT_OPTIONS, type DirectoryLabelerConfig } from './types.js';

/**
 * ラベル決定結果の型定義
 */
export interface LabelDecision {
  /** ラベル名 */
  label: string;
  /** マッチしたパターン（代表） */
  matchedPattern: string;
  /** マッチしたすべてのパターン（Summary根拠表示用） */
  matchedPatterns?: string[];
  /** マッチしたファイル一覧 */
  matchedFiles: string[];
  /** 優先度 */
  priority: number;
  /** マッチ長 */
  matchLength: number;
}

/**
 * ファイルリストからラベルを決定
 *
 * @param files - 判定対象のファイルパス配列
 * @param config - Directory-Based Labeler設定
 * @returns ラベル決定結果の配列またはエラー
 */
export function decideLabelsForFiles(
  files: string[],
  config: DirectoryLabelerConfig,
): Result<LabelDecision[], ReturnType<typeof createPatternError>> {
  // 空のファイルリストは空配列を返す
  if (files.length === 0) {
    core.debug('No files to process. Returning empty label decisions.');
    return ok([]);
  }

  // ルールが空の場合は空配列を返す
  if (config.rules.length === 0) {
    core.debug('No rules defined in configuration. Returning empty label decisions.');
    return ok([]);
  }

  // デフォルトオプションの適用
  const options = config.options || DEFAULT_OPTIONS;

  // デフォルト除外パターンのコンパイル（useDefaultExcludesがfalseの場合はスキップ）
  const defaultExcludePatterns =
    config.useDefaultExcludes !== false ? compilePatterns(DEFAULT_EXCLUDES as unknown as string[], options) : [];

  // ラベルごとにマッチしたファイルを集約
  const labelToFiles = new Map<
    string,
    { files: Set<string>; pattern: string; priority: number; matchLength: number }
  >();

  for (const file of files) {
    const normalizedFile = normalizePath(file);

    // ルールごとに評価
    let bestMatch: { label: string; pattern: string; priority: number; matchLength: number } | null = null;

    for (const rule of config.rules) {
      // includeパターンのコンパイル
      const includePatterns = compilePatterns(rule.include, options, rule.priority);

      // excludeパターンのコンパイル（ユーザー定義 + デフォルト除外）
      const userExcludePatterns = rule.exclude ? compilePatterns(rule.exclude, options) : [];
      const allExcludePatterns = [...defaultExcludePatterns, ...userExcludePatterns];

      // パターンマッチング
      const matchResult = matchIncludePatterns(normalizedFile, includePatterns, allExcludePatterns);

      if (matchResult.matched && matchResult.matchedPattern && matchResult.matchLength !== undefined) {
        const currentPriority = matchResult.priority ?? 0;
        const currentMatchLength = matchResult.matchLength;

        // ベストマッチの更新判定
        if (
          !bestMatch ||
          currentPriority > bestMatch.priority ||
          (currentPriority === bestMatch.priority && currentMatchLength > bestMatch.matchLength)
        ) {
          bestMatch = {
            label: rule.label,
            pattern: matchResult.matchedPattern,
            priority: currentPriority,
            matchLength: currentMatchLength,
          };
        }
      }
    }

    // ベストマッチがあればラベルに追加
    if (bestMatch) {
      const existing = labelToFiles.get(bestMatch.label);
      if (existing) {
        existing.files.add(normalizedFile);
      } else {
        labelToFiles.set(bestMatch.label, {
          files: new Set([normalizedFile]),
          pattern: bestMatch.pattern,
          priority: bestMatch.priority,
          matchLength: bestMatch.matchLength,
        });
      }
    }
  }

  // ラベル決定結果の構築
  const decisions: LabelDecision[] = [];
  for (const [label, info] of labelToFiles.entries()) {
    decisions.push({
      label,
      matchedPattern: info.pattern,
      matchedFiles: Array.from(info.files),
      priority: info.priority,
      matchLength: info.matchLength,
    });
  }

  // 優先度順にソート（priority降順 → matchLength降順）
  decisions.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    return b.matchLength - a.matchLength;
  });

  core.debug(`Decided ${decisions.length} labels for ${files.length} files.`);
  return ok(decisions);
}

/**
 * max_labelsによるフィルタリング
 *
 * @param decisions - ラベル決定結果の配列
 * @param maxLabels - 適用ラベル数の上限（0は無制限）
 * @returns 選択されたラベルと却下されたラベル
 */
export function filterByMaxLabels(
  decisions: LabelDecision[],
  maxLabels: number,
): {
  selected: LabelDecision[];
  rejected: Array<{ label: string; reason: string }>;
} {
  // max_labels=0は無制限
  if (maxLabels === 0 || decisions.length <= maxLabels) {
    return { selected: decisions, rejected: [] };
  }

  // 優先度順にソート（priority降順 → matchLength降順）
  const sorted = [...decisions].sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }
    return b.matchLength - a.matchLength;
  });

  // 上位N件を選択
  const selected = sorted.slice(0, maxLabels);
  const rejected = sorted.slice(maxLabels).map(d => ({
    label: d.label,
    reason: `Exceeded max_labels limit (${maxLabels}). Label priority: ${d.priority}, match length: ${d.matchLength}`,
  }));

  core.warning(
    `max_labels=${maxLabels} exceeded. Selected ${selected.length} labels, rejected ${rejected.length} labels.`,
  );

  return { selected, rejected };
}
