/**
 * i18n (Internationalization) モジュール
 *
 * i18nextライブラリを使用した多言語対応システムの初期化と翻訳関数を提供します。
 */

import * as core from '@actions/core';
import i18next, { type TOptions } from 'i18next';
import { err, ok, type Result } from 'neverthrow';

import { ensureError } from './errors/helpers.js';
import type { ConfigurationError } from './errors/types.js';
import commonEn from './locales/en/common.json';
import errorsEn from './locales/en/errors.json';
import labelsEn from './locales/en/labels.json';
import logsEn from './locales/en/logs.json';
// 翻訳リソースの静的import (nccバンドルに自動同梱される)
import summaryEn from './locales/en/summary.json';
import commonJa from './locales/ja/common.json';
import errorsJa from './locales/ja/errors.json';
import labelsJa from './locales/ja/labels.json';
import logsJa from './locales/ja/logs.json';
import summaryJa from './locales/ja/summary.json';
import type { LanguageCode, Namespace } from './types/i18n.js';
import { isPromise } from './utils/type-guards.js';

/**
 * i18next初期化済みフラグ
 */
let isI18nInitialized = false;

/**
 * 翻訳関数のキャッシュ
 */
/**
 * BoundTFunction type represents a simplified translation function signature.
 * Note: Type assertion `as BoundTFunction` is used when binding i18next.t
 * due to i18next's complex method overloading that makes type inference difficult.
 * This is a technical constraint of the i18next library's type definitions.
 */
type BoundTFunction = (key: string, options?: TOptions) => string;

let cachedTFunction: BoundTFunction | null = null;

/**
 * 言語コードを正規化
 *
 * @param lang - 言語コード (例: 'ja-JP', 'en-US', 'ja', 'en')
 * @returns 正規化された言語コード ('en' | 'ja')、不正な場合はデフォルト'en'
 *
 * @example
 * normalizeLanguageCode('ja-JP') // => 'ja'
 * normalizeLanguageCode('en-US') // => 'en'
 * normalizeLanguageCode('fr') // => 'en' (warning logged)
 */
export function normalizeLanguageCode(lang: string): LanguageCode {
  // 小文字に変換して先頭2文字を取得
  const normalized = lang.toLowerCase().slice(0, 2);

  if (normalized === 'en' || normalized === 'ja') {
    return normalized;
  }

  console.warn(`[i18n] Invalid language code: "${lang}". Falling back to English. Supported languages: en, ja`);
  return 'en';
}

/**
 * i18nextを初期化
 *
 * @param language - 言語コード ('en' | 'ja')
 * @returns 初期化結果 (成功/失敗)
 */
export function initializeI18n(language: LanguageCode): Result<void, ConfigurationError> {
  core.debug(`[i18n] Initializing with language: ${language}`);

  try {
    // 翻訳リソース定義 (静的import)
    const resources = {
      en: {
        summary: summaryEn,
        errors: errorsEn,
        logs: logsEn,
        labels: labelsEn,
        common: commonEn,
      },
      ja: {
        summary: summaryJa,
        errors: errorsJa,
        logs: logsJa,
        labels: labelsJa,
        common: commonJa,
      },
    };

    // i18nextが既に初期化されているかチェック（内部フラグを確認）
    const alreadyInitialized = i18next.isInitialized === true;

    if (alreadyInitialized) {
      // 既に初期化済みの場合、リソースを再登録して言語を変更
      // これにより、テスト環境でresetI18n()後の再初期化にも対応できる
      Object.entries(resources).forEach(([lang, namespaces]) => {
        Object.entries(namespaces).forEach(([ns, resource]) => {
          // addResourceBundle(lng, ns, resources, deep, overwrite)
          // deep=true: 既存リソースとマージ
          // overwrite=true: 既存のキーを上書き
          i18next.addResourceBundle(lang, ns, resource, true, true);
        });
      });

      // アプリケーション側のフラグを先に更新（changeLanguage()がisI18nInitializedをチェックするため）
      isI18nInitialized = true;
      cachedTFunction = i18next.t.bind(i18next) as BoundTFunction;

      const currentLang = getCurrentLanguage();
      if (currentLang !== language) {
        core.debug(`[i18n] Changing language from ${currentLang} to ${language}`);
        changeLanguage(language);
      } else {
        core.debug('[i18n] Language already set, skipping changeLanguage');
      }

      core.debug('[i18n] Reused existing i18n instance');
      return ok(undefined);
    }

    // i18next初期化（初回のみ）
    // リソースを静的に渡す場合、i18nextは同期的に初期化される
    // init()はTFunction または Promise<TFunction>を返すが、
    // 静的リソースの場合はTFunctionが即座に返される
    i18next.init({
      lng: language,
      fallbackLng: 'en',
      ns: ['summary', 'errors', 'logs', 'labels', 'common'],
      defaultNS: 'summary',
      resources,
      debug: false, // プロダクションでは無効
      initAsync: false, // 即座に初期化（非同期バックエンドを使用しない）
      interpolation: {
        escapeValue: false, // Reactを使用しないため不要
      },
    });

    // 初期化完了後にフラグとキャッシュを設定
    // 静的リソースの場合、init()呼び出し後すぐにt()が使用可能になる
    isI18nInitialized = true;
    cachedTFunction = i18next.t.bind(i18next) as BoundTFunction;

    core.debug('[i18n] Initialization completed successfully');
    return ok(undefined);
  } catch (error) {
    const errorMessage = ensureError(error).message;
    core.debug(`[i18n] Initialization failed: ${errorMessage}`);
    // Directly create ConfigurationError to avoid circular dependency with errors/factories.ts
    return err({
      type: 'ConfigurationError' as const,
      field: 'language',
      value: language,
      message: `Failed to initialize i18n: ${errorMessage}`,
    });
  }
}

/**
 * 翻訳キーから翻訳テキストを取得
 *
 * @param namespace - 名前空間 (summary)
 * @param key - 翻訳キー (ドット区切り lowerCamel)
 * @param options - 補間変数等のオプション
 * @returns 翻訳されたテキスト
 *
 * @example
 * t('summary', 'overview.title') // => "PR Metrics Overview" (en) / "PRメトリクス概要" (ja)
 * t('summary', 'basicMetrics.totalAdditions', { count: 100 }) // => "Total Additions: 100"
 */
export function t(namespace: Namespace, key: string, options?: TOptions): string {
  if (!isI18nInitialized || !cachedTFunction) {
    console.warn(`[i18n] not initialized, returning key as fallback: ${namespace}:${key}`);
    return key;
  }

  try {
    const translationKey = `${namespace}:${key}`;

    if (options === undefined) {
      return cachedTFunction(translationKey);
    }

    return cachedTFunction(translationKey, options);
  } catch (error) {
    console.warn(`[i18n] Translation failed for key "${namespace}:${key}", returning key as fallback: ${error}`);
    return key;
  }
}

/**
 * 現在の言語を取得
 *
 * @returns 現在の言語コード ('en' | 'ja')
 */
export function getCurrentLanguage(): LanguageCode {
  if (!isI18nInitialized) {
    return 'en';
  }

  const language = i18next.language;
  return normalizeLanguageCode(language);
}

/**
 * i18nが初期化済みかどうかを確認
 *
 * @returns 初期化済みの場合true
 */
export function isInitialized(): boolean {
  return isI18nInitialized;
}

/**
 * 言語を変更 (テスト用)
 *
 * @param lang - 言語コード ('en' | 'ja')
 * @internal テスト専用関数
 *
 * Note: changeLanguage()は同期的に実行されることを前提としています。
 * i18nextは静的リソースを使用する場合、changeLanguage()は同期的に完了します。
 */
export function changeLanguage(lang: LanguageCode): void {
  if (!isI18nInitialized) {
    return;
  }

  // Make the new language observable synchronously for callers/tests.
  // i18next may switch asynchronously in Node, so set the visible state first.
  i18next.language = lang;
  cachedTFunction = i18next.t.bind(i18next) as BoundTFunction;

  // Kick the real language change; update t() again on completion (if async).
  const result = i18next.changeLanguage(lang, () => {
    cachedTFunction = i18next.t.bind(i18next) as BoundTFunction;
  });
  // Check if result is a Promise using type guard
  if (result && isPromise(result)) {
    // No await here by design; immediate reads already see lang above.
  }
}

/**
 * i18nをリセット (テスト用)
 *
 * @internal テスト専用関数
 *
 * Note: テスト環境で言語を切り替える際に使用する。
 * アプリケーション側のフラグのみリセットし、i18nextの内部状態は保持する。
 * これにより、次回のinitializeI18n()でaddResourceBundle()を使って
 * リソースを再登録し、changeLanguage()で言語を切り替えることができる。
 */
export function resetI18n(): void {
  // アプリケーション側のフラグをリセット
  // これにより、次回のinitializeI18n()が確実に実行される
  isI18nInitialized = false;
  cachedTFunction = null;

  // i18nextの内部状態は保持する
  // (isInitialized=true, store, services etc. はそのまま)
  // これにより、addResourceBundle()とchangeLanguage()が正しく動作する
}

/**
 * ラベルの多言語表示名を取得
 *
 * 優先順位:
 * 1. カテゴリ設定のdisplay_name（カスタム翻訳）
 * 2. labels名前空間の翻訳
 * 3. ラベル名そのまま
 *
 * @param labelName - ラベル名 (例: "size/small", "category/tests")
 * @param categories - カテゴリ設定配列
 * @returns 多言語化されたラベル表示名
 *
 * @example
 * const categories = [{
 *   label: 'category/tests',
 *   patterns: ['**\/*.test.ts'],
 *   display_name: { en: 'Test Files', ja: 'テストファイル' }
 * }];
 * getLabelDisplayName('category/tests', categories) // => 'Test Files' (英語時)
 * getLabelDisplayName('category/tests', categories) // => 'テストファイル' (日本語時)
 */
export function getLabelDisplayName(
  labelName: string,
  categories: Array<{ label: string; display_name?: { en: string; ja: string } }>,
): string {
  const currentLang = getCurrentLanguage();

  // 1. カテゴリ設定のdisplay_nameを優先
  const category = categories.find(cat => cat.label === labelName);
  if (category?.display_name) {
    return category.display_name[currentLang];
  }

  // 2. labels名前空間の翻訳を試す
  // ラベル名を翻訳キーに変換 (例: "size/small" => "size.small")
  const translationKey = labelName.replace(/\//g, '.');

  // 翻訳が存在するかチェック（キーが見つからない場合はキー文字列をそのまま返す）
  const translated = t('labels', translationKey);

  // i18nextは翻訳が見つからない場合、キーをそのまま返す
  // translatedがキーと異なる場合は翻訳が見つかった
  if (translated !== translationKey) {
    return translated;
  }

  // 3. 翻訳もdisplay_nameもない場合はラベル名をそのまま返す
  return labelName;
}
