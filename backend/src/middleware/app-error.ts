/**
 * Custom error hierarchy.
 *
 * All operational errors extend AppError so the global error middleware
 * can distinguish them from unexpected programmer errors (e.g., null
 * dereferences, type errors) and respond accordingly.
 *
 *   AppError          — base: known, operational error with an HTTP status
 *   ├── NotFoundError  — 404
 *   ├── ValidationError — 400 (manual, not Zod)
 *   └── ConflictError  — 409
 *
 * Programmer errors (Error, TypeError, etc.) bubble up to the middleware
 * and produce a generic 500 without leaking internals.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    // Restore the prototype chain broken by extending built-in Error.
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super(`${resource} not found`, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
  }
}
