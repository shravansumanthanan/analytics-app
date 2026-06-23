import { z } from 'zod';

export const createAnnotationSchema = z.object({
  timestampMs: z.number().int().nonnegative('timestampMs must be a non-negative integer'),
  note: z.string().min(1, 'Note text cannot be empty'),
  author: z.string().min(1, 'Author name is required').default('Admin'),
});

export type CreateAnnotationInput = z.infer<typeof createAnnotationSchema>;
