import { describe, expect, it } from 'vitest';

import { parseSize } from '../src/parsers/size-parser';

describe('SizeParser', () => {
  describe('parseSize', () => {
    describe('Valid size strings', () => {
      it('should parse plain number strings', () => {
        const result = parseSize('500000');
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe(500000);
        }
      });

      it('should parse KB units', () => {
        const result1 = parseSize('100KB');
        expect(result1.isOk()).toBe(true);
        if (result1.isOk()) {
          expect(result1.value).toBe(102400);
        }

        const result2 = parseSize('100kb');
        expect(result2.isOk()).toBe(true);
        if (result2.isOk()) {
          expect(result2.value).toBe(102400);
        }

        const result3 = parseSize('100 KB');
        expect(result3.isOk()).toBe(true);
        if (result3.isOk()) {
          expect(result3.value).toBe(102400);
        }
      });

      it('should parse MB units', () => {
        const result1 = parseSize('1MB');
        expect(result1.isOk()).toBe(true);
        if (result1.isOk()) {
          expect(result1.value).toBe(1048576);
        }

        const result2 = parseSize('1.5MB');
        expect(result2.isOk()).toBe(true);
        if (result2.isOk()) {
          expect(result2.value).toBe(1572864);
        }

        const result3 = parseSize('10 mb');
        expect(result3.isOk()).toBe(true);
        if (result3.isOk()) {
          expect(result3.value).toBe(10485760);
        }
      });

      it('should parse GB units', () => {
        const result1 = parseSize('1GB');
        expect(result1.isOk()).toBe(true);
        if (result1.isOk()) {
          expect(result1.value).toBe(1073741824);
        }

        const result2 = parseSize('2.5GB');
        expect(result2.isOk()).toBe(true);
        if (result2.isOk()) {
          expect(result2.value).toBe(2684354560);
        }
      });

      it('should parse B units', () => {
        const result = parseSize('1000B');
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe(1000);
        }
      });

      it('should handle decimal values', () => {
        const result1 = parseSize('0.5MB');
        expect(result1.isOk()).toBe(true);
        if (result1.isOk()) {
          expect(result1.value).toBe(524288);
        }

        const result2 = parseSize('1.25KB');
        expect(result2.isOk()).toBe(true);
        if (result2.isOk()) {
          expect(result2.value).toBe(1280);
        }
      });

      it('should handle spaces and different cases', () => {
        const result1 = parseSize(' 100 KB ');
        expect(result1.isOk()).toBe(true);
        if (result1.isOk()) {
          expect(result1.value).toBe(102400);
        }

        const result2 = parseSize('1mB');
        expect(result2.isOk()).toBe(true);
        if (result2.isOk()) {
          expect(result2.value).toBe(1048576);
        }

        const result3 = parseSize('1Mb');
        expect(result3.isOk()).toBe(true);
        if (result3.isOk()) {
          expect(result3.value).toBe(1048576);
        }
      });

      it('should parse using bytes library format', () => {
        const result1 = parseSize('1kB');
        expect(result1.isOk()).toBe(true);
        if (result1.isOk()) {
          expect(result1.value).toBe(1024);
        }

        const result2 = parseSize('1K');
        expect(result2.isOk()).toBe(true);
        if (result2.isOk()) {
          expect(result2.value).toBe(1024);
        }

        const result3 = parseSize('1M');
        expect(result3.isOk()).toBe(true);
        if (result3.isOk()) {
          expect(result3.value).toBe(1048576);
        }
      });
    });

    describe('Invalid size strings', () => {
      it('should return error for invalid format', () => {
        const result = parseSize('invalid');
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('ParseError');
          expect(result.error.input).toBe('invalid');
          expect(result.error.message).toContain('Invalid size format');
        }
      });

      it('should return error for negative values', () => {
        const result = parseSize('-100KB');
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('ParseError');
          expect(result.error.message).toContain('negative');
        }
      });

      it('should return error for empty string', () => {
        const result = parseSize('');
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('ParseError');
        }
      });

      it('should return error for invalid units', () => {
        const result = parseSize('100TB');
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('ParseError');
          expect(result.error.message).toContain('Invalid size format');
        }
      });

      it('should return error for multiple units', () => {
        const result = parseSize('100KBMB');
        expect(result.isErr()).toBe(true);
        if (result.isErr()) {
          expect(result.error.type).toBe('ParseError');
        }
      });

      it('should return error for multiple values with spaces', () => {
        const result1 = parseSize('10kb 20mb');
        expect(result1.isErr()).toBe(true);
        if (result1.isErr()) {
          expect(result1.error.type).toBe('ParseError');
          expect(result1.error.message).toContain('Multiple values detected');
        }

        const result2 = parseSize('100KB 200MB');
        expect(result2.isErr()).toBe(true);
        if (result2.isErr()) {
          expect(result2.error.type).toBe('ParseError');
          expect(result2.error.message).toContain('Multiple values detected');
        }

        const result3 = parseSize('1.5MB 2GB');
        expect(result3.isErr()).toBe(true);
        if (result3.isErr()) {
          expect(result3.error.type).toBe('ParseError');
          expect(result3.error.message).toContain('Multiple values detected');
        }
      });
    });

    describe('Edge cases', () => {
      it('should handle zero values', () => {
        const result = parseSize('0');
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe(0);
        }
      });

      it('should handle very large values', () => {
        const result = parseSize('10GB');
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe(10737418240);
        }
      });

      it('should round to nearest byte for fractional results', () => {
        const result = parseSize('1.5KB');
        expect(result.isOk()).toBe(true);
        if (result.isOk()) {
          expect(result.value).toBe(1536);
        }
      });
    });
  });
});
