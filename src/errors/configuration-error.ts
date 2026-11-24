import type { ConfigurationError } from './types.js';

export function createConfigurationErrorObject(field: string, value: unknown, message: string): ConfigurationError {
  return {
    type: 'ConfigurationError',
    field,
    value,
    message,
  };
}
