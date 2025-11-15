/**
 * Tests for error helper functions
 */

import { describe, expect, it } from 'vitest';

import { ensureError, extractAggregateError } from '../src/errors/helpers.js';

describe('ensureError', () => {
  describe('Error conversion', () => {
    it('should return Error instance as-is', () => {
      const error = new Error('Test error');
      const result = ensureError(error);

      expect(result).toBe(error);
      expect(result.message).toBe('Test error');
    });

    it('should convert string to Error', () => {
      const result = ensureError('Error message');

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Error message');
    });

    it('should convert unknown to Error with default message', () => {
      const result = ensureError(null);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Unknown error occurred');
    });

    it('should convert number to Error with default message', () => {
      const result = ensureError(42);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Unknown error occurred');
    });

    it('should convert object to Error with default message', () => {
      const result = ensureError({ foo: 'bar' });

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Unknown error occurred');
    });

    it('should use custom default message', () => {
      const result = ensureError(null, 'Custom default message');

      expect(result.message).toBe('Custom default message');
    });
  });

  describe('Custom Error class conversion', () => {
    type CustomErrorInstance = Error & { code: string };
    type CustomErrorCtor = new (message: string) => CustomErrorInstance;

    function createCustomErrorCtor(): CustomErrorCtor {
      function CustomError(message: string): CustomErrorInstance {
        const error = new Error(message);
        Object.setPrototypeOf(error, CustomError.prototype);
        Object.defineProperty(error, 'code', {
          value: 'CUSTOM',
          configurable: true,
          enumerable: true,
          writable: true,
        });
        error.name = 'CustomError';
        if (Error.captureStackTrace) {
          Error.captureStackTrace(error, CustomError);
        }
        return error as CustomErrorInstance;
      }

      (CustomError as unknown as { prototype: CustomErrorInstance }).prototype = Object.create(Error.prototype, {
        constructor: {
          value: CustomError,
          writable: true,
          configurable: true,
        },
      });

      return CustomError as CustomErrorCtor;
    }

    const CustomError = createCustomErrorCtor();

    it('should return matching custom Error instance as-is', () => {
      const error = new CustomError('Custom error');
      const result = ensureError(error, 'Default', CustomError);

      expect(result).toBe(error);
      expect(result).toBeInstanceOf(CustomError);
      expect(result.code).toBe('CUSTOM');
    });

    it('should convert Error to custom Error class', () => {
      const error = new Error('Standard error');
      const result = ensureError(error, 'Default', CustomError);

      expect(result).toBeInstanceOf(CustomError);
      expect(result.message).toBe('Standard error');
    });

    it('should convert string to custom Error class', () => {
      const result = ensureError('Error message', 'Default', CustomError);

      expect(result).toBeInstanceOf(CustomError);
      expect(result.message).toBe('Error message');
    });
  });

  describe('Edge cases', () => {
    it('should handle undefined', () => {
      const result = ensureError(undefined);

      expect(result).toBeInstanceOf(Error);
      expect(result.message).toBe('Unknown error occurred');
    });

    it('should handle empty string', () => {
      const result = ensureError('');

      expect(result).toBeInstanceOf(Error);
      // Empty string is falsy, but ensureError treats string inputs verbatim
      expect(result.message).toBe('');
    });

    it('should handle Error with empty message', () => {
      const error = new Error('');
      const result = ensureError(error);

      expect(result).toBe(error);
      expect(result.message).toBe('');
    });
  });
});

describe('extractAggregateError', () => {
  it('should return Error instance as-is', () => {
    const error = new Error('Test error');
    const result = extractAggregateError(error);

    expect(result).toBe(error);
  });

  it('should extract first error from AggregateError', () => {
    const error1 = new Error('Error 1');
    const error2 = new Error('Error 2');
    const aggregateError = new AggregateError([error1, error2], 'Multiple errors');

    const result = extractAggregateError(aggregateError);

    expect(result).toBe(error1);
    expect(result.message).toBe('Error 1');
  });

  it('should return AggregateError if errors array is empty', () => {
    const aggregateError = new AggregateError([], 'No errors');

    const result = extractAggregateError(aggregateError);

    expect(result).toBe(aggregateError);
    expect(result.message).toBe('No errors');
  });

  it('should convert non-Error values to Error', () => {
    const result1 = extractAggregateError('error string');
    const result2 = extractAggregateError(null);
    const result3 = extractAggregateError(42);

    expect(result1).toBeInstanceOf(Error);
    expect(result1.message).toBe('error string');

    expect(result2).toBeInstanceOf(Error);
    expect(result2.message).toBe('null');

    expect(result3).toBeInstanceOf(Error);
    expect(result3.message).toBe('42');
  });

  it('should handle object with errors array but not AggregateError', () => {
    const error1 = new Error('Error 1');
    const error2 = new Error('Error 2');
    // Must be an actual Error instance with errors property
    const fakeAggregateError = Object.assign(new Error('Fake aggregate'), {
      errors: [error1, error2],
    });

    const result = extractAggregateError(fakeAggregateError);

    // Should extract first error even if not actual AggregateError
    expect(result).toBe(error1);
  });

  it('should handle Promise.allSettled rejection with AggregateError', () => {
    const error1 = new Error('Promise 1 failed');
    const error2 = new Error('Promise 2 failed');
    const aggregateError = new AggregateError([error1, error2], 'Multiple promises failed');

    const result = extractAggregateError(aggregateError);

    expect(result).toBe(error1);
    expect(result.message).toBe('Promise 1 failed');
  });

  it('should preserve TypeError from AggregateError', () => {
    const typeError = new TypeError('Type error');
    const rangeError = new RangeError('Range error');
    const aggregateError = new AggregateError([typeError, rangeError], 'Multiple errors');

    const result = extractAggregateError(aggregateError);

    expect(result).toBe(typeError);
    expect(result).toBeInstanceOf(TypeError);
  });
});
