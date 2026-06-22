/**
 * Domain types for tracked events.
 *
 * Using a discriminated union on `type` means TypeScript can narrow the shape
 * to the exact subtype in any switch/if block — no casting required.
 */

export type EventType = 'page_view' | 'click';

interface BaseEvent {
  readonly sessionId: string;
  readonly url: string;
  readonly timestamp: Date;
  readonly userAgent?: string;
}

export interface PageViewEvent extends BaseEvent {
  readonly type: 'page_view';
}

export interface ClickEvent extends BaseEvent {
  readonly type: 'click';
  readonly x: number;
  readonly y: number;
}

/** The canonical union — every inbound event must be one of these. */
export type TrackedEvent = PageViewEvent | ClickEvent;

/** Projection returned by the heatmap endpoint. */
export interface ClickPoint {
  readonly x: number;
  readonly y: number;
}

/** Session summary returned by GET /api/sessions. */
export interface SessionSummary {
  readonly sessionId: string;
  readonly firstSeen: Date;
  readonly lastSeen: Date;
  readonly eventCount: number;
}
