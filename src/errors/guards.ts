import { hasProperty, isNumber, isObject, isString } from '../utils/type-guards.js';
export {
  hasProperty,
  isBoolean,
  isNonEmptyString,
  isNumber,
  isObject,
  isRecord,
  isString,
} from '../utils/type-guards.js';
import type { ComplexityAnalysisError } from './types.js';
/**
 * Type guard functions for runtime type checking
 */

// ============================================================================
// Basic Type Guards
// ============================================================================

/**
 * Checks if value is an Error instance
 * @param error - Value to check
 * @returns True if the value is an Error instance
 */
export function isError(error: unknown): error is Error {
  return error instanceof Error;
}

/**
 * Checks if object has a message property
 * @param obj - Object to check
 * @returns True if the object has a string message property
 */
export function isErrorWithMessage(obj: unknown): obj is { message: string } {
  return isObject(obj) && hasProperty(obj, 'message') && isString(obj.message);
}

/**
 * Checks if object has type and message properties
 * @param obj - Object to check
 * @returns True if the object has string type and message properties
 */
export function isErrorWithTypeAndMessage(obj: unknown): obj is { type: string; message: string } {
  return (
    isObject(obj) &&
    hasProperty(obj, 'type') &&
    hasProperty(obj, 'message') &&
    isString(obj.type) &&
    isString(obj.message)
  );
}

// ============================================================================
// Error Property Extraction
// ============================================================================

/**
 * Extracts HTTP status code from error (typically from GitHub API errors)
 * @param error - Unknown error value
 * @returns Status code if present, undefined otherwise
 */
export function extractErrorStatus(error: unknown): number | undefined {
  if (isObject(error) && hasProperty(error, 'status') && isNumber(error.status)) {
    return error.status;
  }
  return undefined;
}

/**
 * Checks if value is a ComplexityAnalysisError
 * @param error - Value to check
 * @returns True if the value matches ComplexityAnalysisError structure
 */
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
