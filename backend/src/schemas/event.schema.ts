import { z } from 'zod';

/**
 * Zod schemas are the single source of truth for validation.
 * TypeScript types are DERIVED from them — no duplication.
 *
 * Using z.discriminatedUnion ensures Zod parses the correct subtype
 * based on the `type` discriminant before validating type-specific fields.
 */

const baseEventSchema = z.object({
  sessionId: z.string().min(1, 'sessionId is required'),
  visitorId: z.string().min(1, 'visitorId is required').optional(),
  projectId: z.string().optional(),
  url: z.string().url('url must be a valid URL'),
  timestamp: z.coerce.date(),
  userAgent: z.string().optional(),
});

const pageViewSchema = baseEventSchema.extend({
  type: z.literal('page_view'),
  data: z.object({
    title: z.string().optional(),
    referrer: z.string().optional(),
  }),
});

const clickSchema = baseEventSchema.extend({
  type: z.literal('click'),
  data: z.object({
    x: z.number().finite(),
    y: z.number().finite(),
    offsetX: z.number().finite().optional(),
    offsetY: z.number().finite().optional(),
    selector: z.string().optional(),
    text: z.string().optional(),
  }),
});

const customSchema = baseEventSchema.extend({
  type: z.literal('custom'),
  data: z.object({
    name: z.string(),
    payload: z.record(z.unknown()).optional(),
  }),
});

/** Single event — discriminated on `type`. */
export const trackedEventSchema = z.discriminatedUnion('type', [
  pageViewSchema,
  clickSchema,
  customSchema,
]);

/** Ingest endpoint accepts a batch of one or more events. */
export const ingestEventsSchema = z.array(trackedEventSchema).min(1, 'At least one event is required');

/** Heatmap query params. */
export const heatmapQuerySchema = z.object({
  url: z.string().url('url query param must be a valid URL'),
  sessionId: z.string().optional(),
});

// Derive TypeScript types from schemas — one definition, not two.
export type IngestEventsInput = z.infer<typeof ingestEventsSchema>;
export type HeatmapQuery = z.infer<typeof heatmapQuerySchema>;
