import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodTypeAny } from 'zod';

/**
 * Factory that returns a middleware which validates a specific part of the
 * request (body, query, params) against a Zod schema.
 *
 * Keeps controllers free of validation boilerplate — they can assume the
 * request is already well-typed by the time they run.
 *
 * Usage:
 *   router.post('/', validate('body', ingestEventsSchema), controller.ingest)
 */
export function validate(
  target: 'body' | 'query' | 'params',
  schema: ZodTypeAny,
) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync(req[target]);
      // Replace the raw request data with the parsed (and coerced) data.
      req[target] = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        next(err);
      } else {
        next(new Error('Validation middleware encountered an unexpected error'));
      }
    }
  };
}
