import { describe, expect, it } from 'vitest';

import {
  isValidMinimatchPattern,
  validateMinimatchPattern,
  validateMinimatchPatterns,
} from '../src/utils/pattern-validator.js';

describe('validateMinimatchPattern', () => {
  describe('valid patterns', () => {
    it('should accept simple pattern', () => {
      const result = validateMinimatchPattern('*.ts');
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toBe('*.ts');
      }
    });

    it('should accept glob pattern with directory', () => {
      const result = validateMinimatchPattern('src/**/*.ts');
      expect(result.isOk()).toBe(true);
    });

    it('should accept brace expansion', () => {
      const result = validateMinimatchPattern('*.{ts,js}');
      expect(result.isOk()).toBe(true);
    });

    it('should accept character class', () => {
      const result = validateMinimatchPattern('[a-z]*.ts');
      expect(result.isOk()).toBe(true);
    });

    it('should accept negation', () => {
      const result = validateMinimatchPattern('!*.test.ts');
      expect(result.isOk()).toBe(true);
    });

    it('should accept valid escape sequences', () => {
      const result = validateMinimatchPattern('\\*.ts');
      expect(result.isOk()).toBe(true);
    });
  });

  describe('invalid patterns', () => {
    it('should reject empty pattern', () => {
      const result = validateMinimatchPattern('');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.reason).toBe('Empty pattern');
      }
    });

    it('should reject whitespace-only pattern', () => {
      const result = validateMinimatchPattern('   ');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.reason).toBe('Empty pattern');
      }
    });

    it('should reject unbalanced braces (opening only)', () => {
      const result = validateMinimatchPattern('*.{ts');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.reason).toBe('Unbalanced braces');
        expect(result.error.details).toContain('1 opening');
        expect(result.error.details).toContain('0 closing');
      }
    });

    it('should reject unbalanced braces (closing only)', () => {
      const result = validateMinimatchPattern('*.ts}');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.reason).toBe('Unbalanced braces');
      }
    });

    it('should reject unbalanced brackets (opening only)', () => {
      const result = validateMinimatchPattern('[a-z*.ts');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.reason).toBe('Unbalanced brackets');
      }
    });

    it('should reject unbalanced brackets (closing only)', () => {
      const result = validateMinimatchPattern('a-z]*.ts');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.reason).toBe('Unbalanced brackets');
      }
    });

    it('should reject invalid escape sequence', () => {
      const result = validateMinimatchPattern('\\x*.ts');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.reason).toBe('Invalid escape sequence');
        expect(result.error.details).toContain('\\x');
      }
    });

    it('should reject empty brace expansion', () => {
      const result = validateMinimatchPattern('*{}');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.reason).toBe('Empty brace expansion');
      }
    });

    it('should reject empty character class', () => {
      const result = validateMinimatchPattern('*[]');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.reason).toBe('Empty character class');
      }
    });

    it('should reject pattern starting with }', () => {
      const result = validateMinimatchPattern('}*.ts');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.reason).toBe('Unbalanced braces');
      }
    });

    it('should reject pattern starting with ]', () => {
      const result = validateMinimatchPattern(']*.ts');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.reason).toBe('Unbalanced brackets');
      }
    });

    it('should reject nested braces', () => {
      const result = validateMinimatchPattern('{{}}');
      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error.reason).toBe('Empty brace expansion');
      }
    });
  });
});

describe('validateMinimatchPatterns', () => {
  it('should validate multiple valid patterns', () => {
    const result = validateMinimatchPatterns(['*.ts', '*.js', 'src/**/*.tsx']);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual(['*.ts', '*.js', 'src/**/*.tsx']);
    }
  });

  it('should fail on first invalid pattern', () => {
    const result = validateMinimatchPatterns(['*.ts', '*.{js', 'src/**/*.tsx']);
    expect(result.isErr()).toBe(true);
    if (result.isErr()) {
      expect(result.error.pattern).toBe('*.{js');
      expect(result.error.reason).toBe('Unbalanced braces');
    }
  });

  it('should handle empty array', () => {
    const result = validateMinimatchPatterns([]);
    expect(result.isOk()).toBe(true);
    if (result.isOk()) {
      expect(result.value).toEqual([]);
    }
  });
});

describe('isValidMinimatchPattern', () => {
  it('should return true for valid pattern', () => {
    expect(isValidMinimatchPattern('*.ts')).toBe(true);
  });

  it('should return false for invalid pattern', () => {
    expect(isValidMinimatchPattern('*.{ts')).toBe(false);
  });

  it('should return false for empty pattern', () => {
    expect(isValidMinimatchPattern('')).toBe(false);
  });
});
