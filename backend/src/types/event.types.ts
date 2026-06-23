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
export type ScrollDepthEvent = Extract<TrackedEvent, { type: 'scroll_depth' }>;
export type MouseMoveEvent = Extract<TrackedEvent, { type: 'mouse_move' }>;
export type JsErrorEvent = Extract<TrackedEvent, { type: 'js_error' }>;

/** Projection returned by the heatmap endpoint. */
export interface ClickPoint {
  readonly x: number;
  readonly y: number;
  readonly count: number;
  readonly offsetX?: number;
  readonly offsetY?: number;
  readonly selector?: string;
}

/** Session summary returned by GET /api/sessions. */
export interface SessionSummary {
  readonly id: string;
  readonly visitorId: string;
  readonly userAgent: string;
  readonly startedAt: Date;
  readonly lastActiveAt: Date;
  readonly eventCount: number;
  readonly frustrationCount: number;
  readonly sessionDuration?: number;
  readonly bounce?: boolean;
  readonly pageViewsCount?: number;
  readonly deviceType?: string;
  readonly country?: string;
  readonly region?: string;
  readonly city?: string;
  readonly utmSource?: string;
  readonly utmMedium?: string;
  readonly utmCampaign?: string;
}
