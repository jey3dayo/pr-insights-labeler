/**
 * Shared runtime type guard utilities
 */

/**
 * Checks whether a value is a non-null object (excluding arrays)
 */
export function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Checks whether a value is a plain record (non-null object excluding arrays)
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return isObject(value);
}

/**
 * Checks whether a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Checks whether a value is a non-empty string
 */
export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value !== '';
}

/**
 * Checks whether a value is a number (finite)
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Checks whether a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Checks whether a value is an array of strings
 */
export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

/**
 * Checks whether a value is a non-empty array of strings
 */
export function isNonEmptyStringArray(value: unknown): value is [string, ...string[]] {
  return isStringArray(value) && value.length > 0;
}

/**
 * Checks whether an object has the provided property key
 */
export function hasProperty<TKey extends PropertyKey>(
  value: unknown,
  key: TKey,
): value is Record<TKey, unknown> & Record<PropertyKey, unknown> {
  return isObject(value) && key in value;
}

/**
 * Checks whether a value is a Promise
 */
export function isPromise<T = unknown>(value: unknown): value is Promise<T> {
  return isObject(value) && hasProperty(value, 'then') && typeof value.then === 'function';
}

/**
 * Checks whether a value is a ConfigurationError
 */
export function isConfigurationError(
  value: unknown,
): value is { type: 'ConfigurationError'; field: string; value: unknown; message: string } {
  return (
    isObject(value) &&
    hasProperty(value, 'type') &&
    value.type === 'ConfigurationError' &&
    hasProperty(value, 'field') &&
    isString(value.field) &&
    hasProperty(value, 'value') &&
    hasProperty(value, 'message') &&
    isString(value.message)
  );
}
