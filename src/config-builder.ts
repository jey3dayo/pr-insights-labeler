/**
 * Config Builder
 *
 * 全ての設定ソースを統合し、CompleteConfig を構築
 * 参考: action-cache の createClientConfig()
 */

import { logDebug } from './actions-io.js';
import type { EnvironmentConfig } from './environment-loader.js';
import { normalizeLanguageCode } from './i18n.js';
import type { Config } from './input-mapper.js';
import type { ParsedInputs } from './input-parser.js';
import type { LabelerConfig } from './labeler-types.js';
import type { LanguageCode } from './types/i18n.js';

/**
 * CompleteConfig (全ての設定ソースを統合した完全な設定)
 *
 * Config インターフェースを拡張し、language フィールドを LanguageCode に置き換え
 */
export interface CompleteConfig extends Omit<Config, 'language'> {
  language: LanguageCode; // 言語コードは必ず LanguageCode ('en' | 'ja') に収束
}

/**
 * 設定ソースの種類
 */
type ConfigSource = 'action-input' | 'labeler-config' | 'environment' | 'default';

/**
 * 言語設定と由来
 */
interface LanguageResolution {
  value: LanguageCode;
  source: ConfigSource;
}

/**
 * 全ての設定ソースを統合し、CompleteConfig を構築
 *
 * 優先順位:
 *   1. parsedInputs (action input - パース・バリデーション済み)
 *   2. labelerConfig (pr-labeler.yml)
 *   3. envConfig (環境変数)
 *   4. デフォルト値
 *
 * 参考: action-cache の createClientConfig()
 *
 * @param parsedInputs - パース済みの型安全な action inputs
 * @param labelerConfig - pr-labeler.yml の設定
 * @param envConfig - 環境変数の設定
 * @returns 統合された完全な設定
 */
export function buildCompleteConfig(
  parsedInputs: ParsedInputs,
  labelerConfig: LabelerConfig,
  envConfig: EnvironmentConfig,
): CompleteConfig {
  // 言語設定の優先順位解決
  const language = resolveLanguage(parsedInputs.language, labelerConfig.language, envConfig.language);

  // デバッグログ出力
  logDebug('[Config Builder] Configuration sources:');
  logDebug(`  - Action input language: ${parsedInputs.language ?? 'undefined'}`);
  logDebug(`  - Labeler config language: ${labelerConfig.language ?? 'undefined'}`);
  logDebug(`  - Environment language: ${envConfig.language ?? 'undefined'}`);
  logDebug(`  - Resolved language: ${language.value} (source: ${language.source})`);

  // CompleteConfig を構築
  const config: CompleteConfig = {
    language: language.value,

    // ParsedInputs から型安全に取得
    githubToken: parsedInputs.githubToken,
    fileSizeLimit: parsedInputs.fileSizeLimit,
    fileLinesLimit: parsedInputs.fileLinesLimit,
    prAdditionsLimit: parsedInputs.prAdditionsLimit,
    prFilesLimit: parsedInputs.prFilesLimit,
    sizeEnabled: parsedInputs.sizeEnabled,
    sizeThresholds: parsedInputs.sizeThresholds,
    complexityEnabled: parsedInputs.complexityEnabled,
    complexityThresholdsV2: parsedInputs.complexityThresholdsV2,
    categoryEnabled: parsedInputs.categoryEnabled,
    riskEnabled: parsedInputs.riskEnabled,
    autoRemoveLabels: parsedInputs.autoRemoveLabels,
    largeFilesLabel: parsedInputs.largeFilesLabel,
    tooManyFilesLabel: parsedInputs.tooManyFilesLabel,
    tooManyLinesLabel: parsedInputs.tooManyLinesLabel,
    excessiveChangesLabel: parsedInputs.excessiveChangesLabel,
    skipDraftPr: parsedInputs.skipDraftPr,
    commentOnPr: parsedInputs.commentOnPr,
    failOnLargeFiles: parsedInputs.failOnLargeFiles,
    failOnTooManyFiles: parsedInputs.failOnTooManyFiles,
    failOnPrSize: parsedInputs.failOnPrSize,
    enableSummary: parsedInputs.enableSummary,
    additionalExcludePatterns: parsedInputs.additionalExcludePatterns,
    enableDirectoryLabeling: parsedInputs.enableDirectoryLabeling,
    directoryLabelerConfigPath: parsedInputs.directoryLabelerConfigPath,
    maxLabels: parsedInputs.maxLabels,
    useDefaultExcludes: parsedInputs.useDefaultExcludes,
  };

  return config;
}

/**
 * 言語設定の優先順位解決
 *
 * 全ソースに normalizeLanguageCode() を適用
 *
 * @param actionInput - action input の language 設定
 * @param configFile - pr-labeler.yml の language 設定（ロケール形式 'ja-JP' も許容）
 * @param env - 環境変数の language 設定
 * @returns 言語コードと設定ソース
 */
function resolveLanguage(
  actionInput: string | undefined,
  configFile: string | undefined,
  env: string | undefined,
): LanguageResolution {
  // 優先度1: action input
  if (actionInput !== undefined) {
    return {
      value: normalizeLanguageCode(actionInput),
      source: 'action-input',
    };
  }

  // 優先度2: pr-labeler.yml
  if (configFile !== undefined) {
    return {
      value: normalizeLanguageCode(configFile),
      source: 'labeler-config',
    };
  }

  // 優先度3: 環境変数
  if (env !== undefined) {
    return {
      value: normalizeLanguageCode(env),
      source: 'environment',
    };
  }

  // 優先度4: デフォルト値
  return {
    value: 'en',
    source: 'default',
  };
}
