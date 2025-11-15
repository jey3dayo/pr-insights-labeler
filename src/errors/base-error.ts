/**
 * Base Error constructor and ErrorLevel type
 * Following action-cache pattern for unified error handling
 */

/**
 * Error severity levels
 * - warning: Non-critical error that doesn't prevent execution
 * - info: Informational error for logging purposes
 */
export type ErrorLevel = 'warning' | 'info';

/**
 * Base Error interface with errorLevel support
 */
export interface BaseError extends Error {
  readonly errorLevel: ErrorLevel;
}

type BaseErrorConstructor = new (message: string, errorLevel?: ErrorLevel, options?: { cause?: unknown }) => BaseError;

const BaseErrorImplementation = function BaseErrorImplementation(
  this: Error,
  message: string,
  errorLevel: ErrorLevel = 'warning',
  options?: { cause?: unknown },
): BaseError {
  const actualError = new Error(message, options);
  const prototype = new.target?.prototype ?? BaseErrorImplementation.prototype;
  Object.setPrototypeOf(actualError, prototype);
  Object.defineProperty(actualError, 'name', {
    value: new.target?.name ?? 'BaseError',
    configurable: true,
  });

  if (Error.captureStackTrace) {
    Error.captureStackTrace(actualError, new.target ?? BaseErrorImplementation);
  }

  Object.defineProperty(actualError, 'errorLevel', {
    value: errorLevel,
    enumerable: true,
    configurable: false,
    writable: false,
  });

  return actualError as BaseError;
};

BaseErrorImplementation.prototype = Object.create(Error.prototype, {
  constructor: {
    value: BaseErrorImplementation,
    writable: true,
    configurable: true,
  },
});

export const BaseError = BaseErrorImplementation as unknown as BaseErrorConstructor & { prototype: BaseError };
