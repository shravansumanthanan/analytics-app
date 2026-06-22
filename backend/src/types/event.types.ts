/**
 * Domain types for tracked events.
 *
 * Types are derived from Zod schemas as the single source of truth.
 * Using a discriminated union on `type` means TypeScript can narrow the shape
 * to the exact subtype in any switch/if block — no casting required.
 */
import { z } from 'zod';
import { trackedEventSchema } from '../schemas/event.schema';

/** The canonical union — every inbound event must be one of these. */
export type TrackedEvent = z.infer<typeof trackedEventSchema>;

export type EventType = TrackedEvent['type'];

export type PageViewEvent = Extract<TrackedEvent, { type: 'page_view' }>;
export type ClickEvent = Extract<TrackedEvent, { type: 'click' }>;
export type CustomEvent = Extract<TrackedEvent, { type: 'custom' }>;

/** Projection returned by the heatmap endpoint. */
export interface ClickPoint {
  readonly x: number;
  readonly y: number;
  readonly count: number;
}

/** Session summary returned by GET /api/sessions. */
export interface SessionSummary {
  readonly id: string;
  readonly visitorId: string;
  readonly userAgent: string;
  readonly startedAt: Date;
  readonly lastActiveAt: Date;
  readonly eventCount: number;
}
