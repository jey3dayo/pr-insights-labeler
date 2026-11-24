import { changeLanguage, initializeI18n, resetI18n } from '../../src/i18n.js';

export const setupI18nEnvironment = (): (() => void) => {
  const originalEnv = { ...process.env };
  resetI18n();

  return () => {
    process.env = originalEnv;
    resetI18n();
  };
};

export const setupI18nTestEnglish = (): void => {
  resetI18n();
  initializeI18n('en');
  changeLanguage('en');
};

export const setupI18nTestJapanese = (): void => {
  resetI18n();
  initializeI18n('ja');
  changeLanguage('ja');
};

export const teardownI18nTest = (): void => {
  resetI18n();
};

export const withI18nEnglish = <T>(fn: () => T): T => {
  setupI18nTestEnglish();
  try {
    return fn();
  } finally {
    teardownI18nTest();
  }
};

export const withI18nJapanese = <T>(fn: () => T): T => {
  setupI18nTestJapanese();
  try {
    return fn();
  } finally {
    teardownI18nTest();
  }
};

export const withI18nLanguage = <T>(language: string, fn: () => T): T => {
  resetI18n();
  initializeI18n(language);
  changeLanguage(language);

  try {
    return fn();
  } finally {
    teardownI18nTest();
  }
};

export const setupLanguageEnv = (language: string): void => {
  process.env['LANGUAGE'] = language;
};

export const clearLanguageEnv = (): void => {
  delete process.env['LANGUAGE'];
};

export const setupI18nEnvVars = (env: Record<string, string>): void => {
  Object.entries(env).forEach(([key, value]) => {
    process.env[key] = value;
  });
};
