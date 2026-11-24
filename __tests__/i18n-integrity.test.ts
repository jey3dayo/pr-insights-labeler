import { describe, expect, it } from 'vitest';

import commonEn from '../src/locales/en/common.json';
import errorsEn from '../src/locales/en/errors.json';
import labelsEn from '../src/locales/en/labels.json';
import logsEn from '../src/locales/en/logs.json';
import summaryEn from '../src/locales/en/summary.json';
import commonJa from '../src/locales/ja/common.json';
import errorsJa from '../src/locales/ja/errors.json';
import labelsJa from '../src/locales/ja/labels.json';
import logsJa from '../src/locales/ja/logs.json';
import summaryJa from '../src/locales/ja/summary.json';

function getAllKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = [];

  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...getAllKeys(value as Record<string, unknown>, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

function testNamespaceIntegrity(
  namespace: string,
  enResource: Record<string, unknown>,
  jaResource: Record<string, unknown>,
): void {
  describe(`${namespace} namespace`, () => {
    it('Japanese translation has all English keys', () => {
      const enKeys = getAllKeys(enResource);
      const jaKeys = getAllKeys(jaResource);

      const missingKeys = enKeys.filter(key => !jaKeys.includes(key));

      if (missingKeys.length > 0) {
        console.error(`Missing keys in Japanese ${namespace}:`);
        missingKeys.forEach(key => console.error(`  - ${key}`));
      }

      expect(missingKeys).toEqual([]);
    });

    it('Japanese translation has no orphaned keys', () => {
      const enKeys = getAllKeys(enResource);
      const jaKeys = getAllKeys(jaResource);

      const orphanedKeys = jaKeys.filter(key => !enKeys.includes(key));

      if (orphanedKeys.length > 0) {
        console.error(`Orphaned keys in Japanese ${namespace} (not in English):`);
        orphanedKeys.forEach(key => console.error(`  - ${key}`));
      }

      expect(orphanedKeys).toEqual([]);
    });

    it('English and Japanese have same number of keys', () => {
      const enKeys = getAllKeys(enResource);
      const jaKeys = getAllKeys(jaResource);

      expect(jaKeys.length).toBe(enKeys.length);
    });

    it('All translation values are non-empty strings', () => {
      const checkValues = (obj: Record<string, unknown>, path = ''): void => {
        for (const [key, value] of Object.entries(obj)) {
          const fullPath = path ? `${path}.${key}` : key;

          if (value && typeof value === 'object' && !Array.isArray(value)) {
            checkValues(value as Record<string, unknown>, fullPath);
          } else {
            expect(typeof value).toBe('string');
            expect(value).toBeTruthy();
            expect((value as string).trim()).not.toBe('');
          }
        }
      };

      checkValues(enResource, `en.${namespace}`);
      checkValues(jaResource, `ja.${namespace}`);
    });

    it('English and Japanese have same structure', () => {
      const enStructure = JSON.stringify(Object.keys(enResource).sort());
      const jaStructure = JSON.stringify(Object.keys(jaResource).sort());

      expect(jaStructure).toBe(enStructure);
    });

    it('Nested objects have same structure', () => {
      const checkStructure = (enObj: Record<string, unknown>, jaObj: Record<string, unknown>, path = ''): void => {
        const enKeys = Object.keys(enObj).sort();
        const jaKeys = Object.keys(jaObj).sort();

        expect(jaKeys).toEqual(enKeys);

        for (const key of enKeys) {
          const enValue = enObj[key];
          const jaValue = jaObj[key];
          const fullPath = path ? `${path}.${key}` : key;

          if (enValue && typeof enValue === 'object' && !Array.isArray(enValue)) {
            expect(jaValue).toBeTypeOf('object');
            checkStructure(enValue as Record<string, unknown>, jaValue as Record<string, unknown>, fullPath);
          }
        }
      };

      checkStructure(enResource, jaResource, namespace);
    });
  });
}

describe('Translation Integrity', () => {
  testNamespaceIntegrity('summary', summaryEn, summaryJa);
  testNamespaceIntegrity('errors', errorsEn, errorsJa);
  testNamespaceIntegrity('logs', logsEn, logsJa);
  testNamespaceIntegrity('labels', labelsEn, labelsJa);
  testNamespaceIntegrity('common', commonEn, commonJa);

  describe('Cross-namespace validation', () => {
    it('All namespaces are defined', () => {
      const namespaces = ['summary', 'errors', 'logs', 'labels', 'common'];
      expect(namespaces.length).toBe(5);
    });

    it('All English resources are non-empty', () => {
      expect(Object.keys(summaryEn).length).toBeGreaterThan(0);
      expect(Object.keys(errorsEn).length).toBeGreaterThan(0);
      expect(Object.keys(logsEn).length).toBeGreaterThan(0);
      expect(Object.keys(labelsEn).length).toBeGreaterThan(0);
      expect(Object.keys(commonEn).length).toBeGreaterThan(0);
    });

    it('All Japanese resources are non-empty', () => {
      expect(Object.keys(summaryJa).length).toBeGreaterThan(0);
      expect(Object.keys(errorsJa).length).toBeGreaterThan(0);
      expect(Object.keys(logsJa).length).toBeGreaterThan(0);
      expect(Object.keys(labelsJa).length).toBeGreaterThan(0);
      expect(Object.keys(commonJa).length).toBeGreaterThan(0);
    });
  });
});
