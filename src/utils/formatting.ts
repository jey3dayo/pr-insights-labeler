import { getCurrentLanguage } from '../i18n.js';
import type { LanguageCode } from '../types/i18n.js';

const LOCALE_MAP: Record<LanguageCode, string> = {
  en: 'en-US',
  ja: 'ja-JP',
};

export function formatNumber(value: number, lang?: LanguageCode): string {
  const language = lang ?? getCurrentLanguage();
  const locale = LOCALE_MAP[language];

  return new Intl.NumberFormat(locale).format(value);
}

export function formatFileSize(bytes: number, lang?: LanguageCode): string {
  const language = lang ?? getCurrentLanguage();
  const locale = LOCALE_MAP[language];

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  const formatted = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 1,
  }).format(size);

  return `${formatted} ${units[unitIndex]}`;
}
