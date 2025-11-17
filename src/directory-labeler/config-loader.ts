/**
 * Directory-Based Labeler: 設定ローダー
 *
 * YAML設定ファイルの読み込み、パース、バリデーションを担当
 */

import fs from 'node:fs';

import { load as yamlLoad } from 'js-yaml';
import { err, ok, type Result } from 'neverthrow';

import { createConfigurationError, createFileSystemError, ensureError } from '../errors/index.js';
import { validateConfigWithTransformer } from '../utils/config-validation-utils.js';
import { parseDirectoryLabelerConfig } from './transformers/config-transformer.js';
import {
  DEFAULT_NAMESPACES,
  DEFAULT_OPTIONS,
  type DirectoryLabelerConfig,
  type MinimatchOptions,
  type NamespacePolicy,
} from './types.js';

/**
 * Directory-Based Labeler設定ファイルを読み込む
 *
 * @param configPath - 設定ファイルのパス
 * @returns 検証済みの設定オブジェクトまたはエラー
 */
export function loadDirectoryLabelerConfig(
  configPath: string,
): Result<
  DirectoryLabelerConfig,
  ReturnType<typeof createFileSystemError> | ReturnType<typeof createConfigurationError>
> {
  // ファイル存在チェック
  if (!fs.existsSync(configPath)) {
    return err(createFileSystemError(configPath, 'notFound'));
  }

  // ファイル読み込み
  let fileContent: string;
  try {
    fileContent = fs.readFileSync(configPath, 'utf-8');
  } catch {
    return err(createFileSystemError(configPath, 'read'));
  }

  // YAMLパース
  let rawConfig: unknown;
  try {
    // 安全モード: DEFAULT_SCHEMAでYAMLアンカー/エイリアス、マージキーをサポート、任意コード実行は防止
    rawConfig = yamlLoad(fileContent);
  } catch (error) {
    const message = ensureError(error).message;
    return err(createConfigurationError('yaml', fileContent, `YAML parse error: ${message}`));
  }

  // バリデーション
  const validationResult = validateDirectoryLabelerConfig(rawConfig);
  if (validationResult.isErr()) {
    return validationResult;
  }

  const validatedConfig = validationResult.value;

  // デフォルト値の適用
  const configWithDefaults = applyDefaults(validatedConfig);

  return ok(configWithDefaults);
}

/**
 * Directory-Based Labeler設定をバリデーションする
 *
 * @param config - バリデーション対象の設定
 * @returns 検証済み設定またはエラー
 */
export function validateDirectoryLabelerConfig(
  config: unknown,
): Result<DirectoryLabelerConfig, ReturnType<typeof createConfigurationError>> {
  return validateConfigWithTransformer(config, parseDirectoryLabelerConfig);
}

/**
 * デフォルト値を適用する
 *
 * @param config - バリデーション済み設定
 * @returns デフォルト値が適用された設定
 */
function applyDefaults(config: DirectoryLabelerConfig): DirectoryLabelerConfig {
  const options: Required<MinimatchOptions> = {
    ...DEFAULT_OPTIONS,
    ...(config.options || {}),
  };

  const namespaces: Required<NamespacePolicy> = {
    ...DEFAULT_NAMESPACES,
    ...(config.namespaces || {}),
  };

  return {
    ...config,
    options,
    namespaces,
    useDefaultExcludes: config.useDefaultExcludes !== false, // デフォルトtrue
  };
}
