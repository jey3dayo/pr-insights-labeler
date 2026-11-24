import { hasProperty, isNumber, isObject, isString } from '../utils/type-guards.js';
export { isObject, isString } from '../utils/type-guards.js';
import type { ComplexityAnalysisError } from './types.js';

export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

export function isErrorWithMessage(obj: unknown): obj is { message: string } {
  return isObject(obj) && hasProperty(obj, 'message') && isString(obj.message);
}

export function isErrorWithTypeAndMessage(obj: unknown): obj is { type: string; message: string } {
  return (
    isObject(obj) &&
    hasProperty(obj, 'type') &&
    hasProperty(obj, 'message') &&
    isString(obj.type) &&
    isString(obj.message)
  );
}

export function extractErrorStatus(error: unknown): number | undefined {
  if (isObject(error) && hasProperty(error, 'status') && isNumber(error.status)) {
    return error.status;
  }
  return undefined;
}

export function isComplexityAnalysisError(error: unknown): error is ComplexityAnalysisError {
  return (
    isObject(error) &&
    hasProperty(error, 'type') &&
    error.type === 'ComplexityAnalysisError' &&
    hasProperty(error, 'reason') &&
    isString(error.reason) &&
    hasProperty(error, 'message') &&
    isString(error.message)
  );
}
