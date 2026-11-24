export type ErrorLevel = 'warning' | 'info';

export abstract class BaseError extends Error {
  readonly errorLevel: ErrorLevel;

  constructor(message: string, errorLevel: ErrorLevel = 'warning', options?: { cause?: unknown }) {
    super(message, options);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
    this.errorLevel = errorLevel;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, new.target);
    }
  }
}
