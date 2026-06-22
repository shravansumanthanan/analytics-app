import { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { env } from '../config/env';
import { AppError } from './app-error';

/**
 * Global error-handling middleware.
 *
 * Express identifies error-handling middleware by its four-argument signature.
 * All errors — thrown or passed via next(err) — converge here, ensuring a
 * single, consistent JSON error shape across the entire API.
 *
 * Response shape:
 *   { success: false, message: string, errors?: unknown }
 */
export function errorMiddleware(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // 1. Zod validation errors — translate to 400 with field-level detail.
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.flatten().fieldErrors,
    });
    return;
  }

  // 2. Known operational errors — safe to surface to the client.
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // 3. Unknown / programmer errors — log the real error, return a generic 500.
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message:
      env.NODE_ENV === 'development' && err instanceof Error
        ? err.message
        : 'An unexpected error occurred',
  });
}
