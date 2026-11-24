import { isString } from '../utils/type-guards.js';
import { isError, isErrorWithMessage } from './guards.js';

type ErrorConstructor<T extends Error = Error> = new (message: string) => T;

export function ensureError<T extends Error>(
  error: unknown,
  defaultMessage: string = 'Unknown error occurred',
  ErrorClass: ErrorConstructor<T> = Error as unknown as ErrorConstructor<T>,
): T {
  if (error instanceof ErrorClass) {
    return error;
  }
  const message = isError(error)
    ? error.message
    : isString(error)
      ? error
      : isErrorWithMessage(error)
        ? error.message
        : defaultMessage;
  return new ErrorClass(message);
}

export function extractAggregateError(error: unknown): Error {
  if (error instanceof Error && 'errors' in error && Array.isArray(error.errors)) {
    return error.errors[0] ?? error;
  }
  return error instanceof Error ? error : new Error(String(error));
}
