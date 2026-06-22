export interface Session {
  id: string;
  projectId: string;
  visitorId: string;
  userAgent: string;
  ipAddress: string | null;
  startedAt: string;
  lastActiveAt: string;
  duration: number; // calculated field or raw
  eventCount: number; // calculated field
}

export interface BaseEvent {
  id: string;
  sessionId: string;
  timestamp: string;
  type: string;
  url: string;
}

export interface PageViewEvent extends BaseEvent {
  type: 'page_view';
  data: {
    title: string;
    referrer: string;
  };
}

export interface ClickEvent extends BaseEvent {
  type: 'click';
  data: {
    selector: string;
    x: number;
    y: number;
    text?: string;
  };
}

export interface CustomEvent extends BaseEvent {
  type: 'custom';
  data: {
    name: string;
    payload?: Record<string, unknown>;
  };
}

export type AnalyticsEvent = PageViewEvent | ClickEvent | CustomEvent;

export interface HeatmapPoint {
  x: number;
  y: number;
  count: number;
}
