/**
 * Directory-Based Labeler: 設定ローダー
 *
 * YAML設定ファイルの読み込み、パース、バリデーションを担当
 */

import fs from 'node:fs';

import { load as yamlLoad } from 'js-yaml';
import { err, ok, type Result, type ResultAsync } from 'neverthrow';

import { fetchRepositoryConfig, isConfigNotFoundError } from '../config/loaders/github-config-fetcher.js';
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

export type LoadConfigError = ReturnType<typeof createFileSystemError> | ReturnType<typeof createConfigurationError>;

export interface LoadRepositoryConfigParams {
  token: string;
  owner: string;
  repo: string;
  /** 設定ファイルのリポジトリ相対パス */
  configPath: string;
  /** 読み取り対象の commit SHA / ref。省略時はリポジトリのデフォルトブランチ */
  ref?: string;
}

/**
 * Directory-Based Labeler設定ファイルを読み込む
 *
 * @param configPath - 設定ファイルのパス
 * @returns 検証済みの設定オブジェクトまたはエラー
 */
export function loadDirectoryLabelerConfig(configPath: string): Result<DirectoryLabelerConfig, LoadConfigError> {
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

  return parseDirectoryLabelerConfigContent(fileContent);
}

/**
 * Directory-Based Labeler設定をリポジトリから GitHub API 経由で読み込む
 *
 * `pull_request_target` ではローカル checkout（= fork が制御する head）の設定を信頼できないため、
 * 信頼済みの ref からポリシーを読むための経路。存在しない場合（404）は、ローカル FS 経路と同じ
 * 「未存在」セマンティクス（FileSystemError）へ写像し、呼び出し側のデフォルトへのフォールバックを
 * 変えないようにする。
 *
 * @returns 検証済みの設定オブジェクトまたはエラー
 */
export function loadDirectoryLabelerConfigFromRepository(
  params: LoadRepositoryConfigParams,
): ResultAsync<DirectoryLabelerConfig, LoadConfigError> {
  const { configPath } = params;

  return fetchRepositoryConfig({
    token: params.token,
    owner: params.owner,
    repo: params.repo,
    path: configPath,
    ...(params.ref ? { ref: params.ref } : {}),
  })
    .mapErr((error): LoadConfigError =>
      isConfigNotFoundError(error) ? createFileSystemError(configPath, 'notFound') : error,
    )
    .andThen(content => parseDirectoryLabelerConfigContent(content));
}

/**
 * Directory-Based Labeler設定のYAML文字列をパース・検証し、デフォルト値を適用する
 *
 * pr-labeler 側のパーサとは共有しない。DEFAULT_SCHEMA によるアンカー/エイリアスの許可と、
 * directory-labeler 固有のデフォルト適用は本モジュールの契約である。
 */
export function parseDirectoryLabelerConfigContent(
  fileContent: string,
): Result<DirectoryLabelerConfig, ReturnType<typeof createConfigurationError>> {
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

  // デフォルト値の適用
  return ok(applyDefaults(validationResult.value));
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
