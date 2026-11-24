export function isObject(value: unknown): value is Record<PropertyKey, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return isObject(value);
}

export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value !== '';
}

export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

export function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

export function isNonEmptyStringArray(value: unknown): value is [string, ...string[]] {
  return isStringArray(value) && value.length > 0;
}

export function hasProperty<TKey extends PropertyKey>(
  value: unknown,
  key: TKey,
): value is Record<TKey, unknown> & Record<PropertyKey, unknown> {
  return isObject(value) && key in value;
}

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
