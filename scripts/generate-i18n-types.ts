#!/usr/bin/env tsx

import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type summaryEn from '../src/locales/en/summary.json';
import type errorsEn from '../src/locales/en/errors.json';
import type logsEn from '../src/locales/en/logs.json';
import type labelsEn from '../src/locales/en/labels.json';
import type commonEn from '../src/locales/en/common.json';

const OUTPUT_PATH = resolve(__dirname, '../src/types/i18n.d.ts');

function generateTypeDefinitions(): void {
  const content = `/**
 * i18n型定義 (自動生成)
 *
 * このファイルは scripts/generate-i18n-types.ts によって自動生成されます。
 * 手動で編集しないでください。
 */

// 翻訳リソースの型定義をimport
import type summaryEn from '../locales/en/summary.json';
import type errorsEn from '../locales/en/errors.json';
import type logsEn from '../locales/en/logs.json';
import type labelsEn from '../locales/en/labels.json';
import type commonEn from '../locales/en/common.json';

/**
 * 翻訳リソースの型定義
 * Phase 1: resources形状型のみ (DotPath型は将来実装)
 */
export type TranslationResources = {
  summary: typeof summaryEn;
  errors: typeof errorsEn;
  logs: typeof logsEn;
  labels: typeof labelsEn;
  common: typeof commonEn;
};

/**
 * 名前空間の型定義
 */
export type Namespace = 'summary' | 'errors' | 'logs' | 'labels' | 'common';

/**
 * 言語コードの型定義
 */
export type LanguageCode = 'en' | 'ja';

/**
 * i18next型拡張
 * CustomTypeOptionsを定義することで、t()関数の型安全性を実現
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'summary';
    resources: TranslationResources;
  }
}
`;

  writeFileSync(OUTPUT_PATH, content, 'utf-8');
  console.log(`✅ i18n type definitions generated at: ${OUTPUT_PATH}`);
}

try {
  generateTypeDefinitions();
  process.exit(0);
} catch (error) {
  console.error('❌ Failed to generate i18n type definitions:', error);
  process.exit(1);
}
