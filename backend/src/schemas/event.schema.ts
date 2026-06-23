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
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
  utmTerm: z.string().optional(),
  utmContent: z.string().optional(),
  deviceType: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
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
    /** Frustration signal fields — set by the tracker when rage/dead click detected. */
    isFrustrated: z.boolean().optional(),
    frustrationType: z.enum(['rage', 'dead']).optional(),
  }),
});

const customSchema = baseEventSchema.extend({
  type: z.literal('custom'),
  data: z.object({
    name: z.string(),
    payload: z.record(z.unknown()).optional(),
  }),
});

/**
 * Scroll depth — emitted once per page view (on page hide / visibility change).
 * Records the maximum scroll depth reached, not every scroll tick.
 */
const scrollDepthSchema = baseEventSchema.extend({
  type: z.literal('scroll_depth'),
  data: z.object({
    maxDepthPx: z.number().finite().nonnegative(),
    maxDepthPercent: z.number().finite().min(0).max(100),
    pageHeightPx: z.number().finite().nonnegative(),
  }),
});

/**
 * Mouse move sample — batched cursor positions at ≤50ms / >5px-displacement intervals.
 * Stored as an array so one event payload covers an entire sampling period.
 */
const mouseMoveSchema = baseEventSchema.extend({
  type: z.literal('mouse_move'),
  data: z.object({
    points: z.array(
      z.object({
        x: z.number().finite(),
        y: z.number().finite(),
        t: z.number().int().nonnegative(), // ms offset from first point
      }),
    ).min(1).max(200), // hard cap to prevent oversized payloads
  }),
});

/**
 * JavaScript error — emitted by window.onerror and unhandledrejection listeners.
 * Stack trace is truncated to 500 chars to limit payload size and PII risk.
 */
const jsErrorSchema = baseEventSchema.extend({
  type: z.literal('js_error'),
  data: z.object({
    message: z.string().max(500),
    source: z.string().max(200).optional(),
    line: z.number().int().optional(),
    col: z.number().int().optional(),
    stack: z.string().max(500).optional(),
  }),
});

const quickbackSchema = baseEventSchema.extend({
  type: z.literal('quickback'),
  data: z.object({
    url: z.string(),
    timeSpentMs: z.number().finite(),
  }),
});

const excessiveScrollSchema = baseEventSchema.extend({
  type: z.literal('excessive_scroll'),
  data: z.object({
    scrollY: z.number().finite(),
  }),
});

const pageRefreshFrustrationSchema = baseEventSchema.extend({
  type: z.literal('page_refresh_frustration'),
  data: z.object({
    path: z.string(),
  }),
});

const scrollAttentionSchema = baseEventSchema.extend({
  type: z.literal('scroll_attention'),
  data: z.object({
    attentionMap: z.record(z.string(), z.number().finite()),
  }),
});

const rageClickSchema = baseEventSchema.extend({
  type: z.literal('rage_click'),
  data: z.object({
    selector: z.string().optional(),
  }),
});

const deadClickSchema = baseEventSchema.extend({
  type: z.literal('dead_click'),
  data: z.object({
    selector: z.string().optional(),
  }),
});

/** Single event — discriminated on `type`. */
export const trackedEventSchema = z.discriminatedUnion('type', [
  pageViewSchema,
  clickSchema,
  customSchema,
  scrollDepthSchema,
  mouseMoveSchema,
  jsErrorSchema,
  quickbackSchema,
  excessiveScrollSchema,
  pageRefreshFrustrationSchema,
  scrollAttentionSchema,
  rageClickSchema,
  deadClickSchema,
]);

/** Ingest endpoint accepts a batch of one or more events. */
export const ingestEventsSchema = z.array(trackedEventSchema).min(1, 'At least one event is required');

/** Heatmap query params. */
export const heatmapQuerySchema = z.object({
  url: z.string().url('url query param must be a valid URL'),
  type: z.enum(['click', 'attention']).default('click'),
  sessionId: z.string().optional(),
  convertedOnly: z.preprocess((val) => val === 'true', z.boolean()).optional(),
  conversionPath: z.string().optional(),
  conversionEvent: z.string().optional(),
  includeBots: z.preprocess((val) => val === 'true', z.boolean()).optional(),
});

// Derive TypeScript types from schemas — one definition, not two.
export type IngestEventsInput = z.infer<typeof ingestEventsSchema>;
export type HeatmapQuery = z.infer<typeof heatmapQuerySchema>;
