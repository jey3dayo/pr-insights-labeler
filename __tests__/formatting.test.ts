import { describe, expect, it } from 'vitest';

import { formatFileSize, formatNumber } from '../src/utils/formatting';

describe('Formatting Utilities', () => {
  describe('formatNumber', () => {
    it('should format numbers with English locale', () => {
      expect(formatNumber(1000, 'en')).toBe('1,000');
      expect(formatNumber(1000000, 'en')).toBe('1,000,000');
      expect(formatNumber(123456789, 'en')).toBe('123,456,789');
    });

    it('should format numbers with Japanese locale', () => {
      expect(formatNumber(1000, 'ja')).toBe('1,000');
      expect(formatNumber(1000000, 'ja')).toBe('1,000,000');
      expect(formatNumber(123456789, 'ja')).toBe('123,456,789');
    });

    it('should handle zero', () => {
      expect(formatNumber(0, 'en')).toBe('0');
      expect(formatNumber(0, 'ja')).toBe('0');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber(-1000, 'en')).toBe('-1,000');
      expect(formatNumber(-1000, 'ja')).toBe('-1,000');
    });
  });

  describe('formatFileSize', () => {
    it('should format bytes in English', () => {
      expect(formatFileSize(0, 'en')).toBe('0 B');
      expect(formatFileSize(512, 'en')).toBe('512 B');
      expect(formatFileSize(1024, 'en')).toBe('1 KB');
      expect(formatFileSize(1536, 'en')).toBe('1.5 KB');
      expect(formatFileSize(1048576, 'en')).toBe('1 MB');
      expect(formatFileSize(1073741824, 'en')).toBe('1 GB');
    });

    it('should format bytes in Japanese', () => {
      expect(formatFileSize(0, 'ja')).toBe('0 B');
      expect(formatFileSize(512, 'ja')).toBe('512 B');
      expect(formatFileSize(1024, 'ja')).toBe('1 KB');
      expect(formatFileSize(1536, 'ja')).toBe('1.5 KB');
      expect(formatFileSize(1048576, 'ja')).toBe('1 MB');
      expect(formatFileSize(1073741824, 'ja')).toBe('1 GB');
    });

    it('should use 1024 as base unit', () => {
      expect(formatFileSize(1024, 'en')).toBe('1 KB');
      expect(formatFileSize(1048576, 'en')).toBe('1 MB');
      expect(formatFileSize(1073741824, 'en')).toBe('1 GB');
    });

    it('should format with maximum 1 decimal place', () => {
      expect(formatFileSize(1536, 'en')).toBe('1.5 KB');
      expect(formatFileSize(2048, 'en')).toBe('2 KB');
      expect(formatFileSize(2560, 'en')).toBe('2.5 KB');
    });

    it('should have space between number and unit', () => {
      const result = formatFileSize(1024, 'en');
      expect(result).toMatch(/^\d+(\.\d+)? [A-Z]+$/);
      expect(result).toBe('1 KB');
    });

    it('should handle large file sizes', () => {
      const result = formatFileSize(10737418240, 'en');
      expect(result).toBe('10 GB');
    });
  });
});
