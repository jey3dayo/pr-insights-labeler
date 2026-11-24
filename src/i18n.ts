import * as core from '@actions/core';
import i18next, { type TOptions } from 'i18next';
import { err, ok, type Result } from 'neverthrow';

import { createConfigurationErrorObject } from './errors/configuration-error.js';
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

let isI18nInitialized = false;

/**
 * BoundTFunction type represents a simplified translation function signature.
 * Note: Type assertion `as unknown as BoundTFunction` is used when binding i18next.t
 * due to i18next's complex method overloading that makes type inference difficult.
 * This is a technical constraint of the i18next library's type definitions.
 */
type BoundTFunction = (key: string, options?: TOptions) => string;

function bindTFunction(): BoundTFunction {
  return i18next.t.bind(i18next) as unknown as BoundTFunction;
}

let cachedTFunction: BoundTFunction | null = null;

export function normalizeLanguageCode(lang: string): LanguageCode {
  const normalized = lang.toLowerCase().slice(0, 2);

  if (normalized === 'en' || normalized === 'ja') {
    return normalized;
  }

  console.warn(`[i18n] Invalid language code: "${lang}". Falling back to English. Supported languages: en, ja`);
  return 'en';
}

export function initializeI18n(language: LanguageCode): Result<void, ConfigurationError> {
  core.debug(`[i18n] Initializing with language: ${language}`);

  try {
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

    const alreadyInitialized = i18next.isInitialized === true;

    if (alreadyInitialized) {
      Object.entries(resources).forEach(([lang, namespaces]) => {
        Object.entries(namespaces).forEach(([ns, resource]) => {
          i18next.addResourceBundle(lang, ns, resource, true, true);
        });
      });

      const currentLang = normalizeLanguageCode(i18next.language);
      if (currentLang !== language) {
        core.debug(`[i18n] Changing language from ${currentLang} to ${language}`);
        applyLanguage(language);
      } else {
        cachedTFunction = bindTFunction();
        core.debug('[i18n] Language already set, skipping changeLanguage');
      }

      isI18nInitialized = true;

      core.debug('[i18n] Reused existing i18n instance');
      return ok(undefined);
    }

    i18next.init({
      lng: language,
      fallbackLng: 'en',
      ns: ['summary', 'errors', 'logs', 'labels', 'common'],
      defaultNS: 'summary',
      resources,
      debug: false,
      initAsync: false,
      interpolation: {
        escapeValue: false,
      },
    });

    isI18nInitialized = true;
    cachedTFunction = bindTFunction();

    core.debug('[i18n] Initialization completed successfully');
    return ok(undefined);
  } catch (error) {
    const errorMessage = ensureError(error).message;
    core.debug(`[i18n] Initialization failed: ${errorMessage}`);
    return err(createConfigurationErrorObject('language', language, `Failed to initialize i18n: ${errorMessage}`));
  }
}

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

export function getCurrentLanguage(): LanguageCode {
  if (!isI18nInitialized) {
    return 'en';
  }

  const language = i18next.language;
  return normalizeLanguageCode(language);
}

export function isInitialized(): boolean {
  return isI18nInitialized;
}

function applyLanguage(lang: LanguageCode): void {
  // Make the new language observable synchronously for callers/tests.
  // i18next may switch asynchronously in Node, so set the visible state first.
  i18next.language = lang;
  cachedTFunction = bindTFunction();

  void i18next.changeLanguage(lang, () => {
    cachedTFunction = bindTFunction();
  });
}

export function changeLanguage(lang: LanguageCode): void {
  if (!isI18nInitialized) {
    return;
  }

  applyLanguage(lang);
}

export function resetI18n(): void {
  isI18nInitialized = false;
  cachedTFunction = null;
}

export function getLabelDisplayName(
  labelName: string,
  categories: Array<{ label: string; display_name?: { en: string; ja: string } }>,
): string {
  const currentLang = getCurrentLanguage();

  const category = categories.find(cat => cat.label === labelName);
  if (category?.display_name) {
    return category.display_name[currentLang];
  }

  const translationKey = labelName.replace(/\//g, '.');

  const translated = t('labels', translationKey);

  if (translated !== translationKey) {
    return translated;
  }

  return labelName;
}
