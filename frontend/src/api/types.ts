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
  city?: string;
  country?: string;
  region?: string;
  deviceType?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  isBot?: boolean;
  bounce?: boolean;
  frustrationCount?: number;
  sessionDuration?: number;
  pageViewsCount?: number;
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
    offsetX?: number;
    offsetY?: number;
    isFrustrated?: boolean;
  };
}

export interface CustomEvent extends BaseEvent {
  type: 'custom';
  data: {
    name: string;
    payload?: Record<string, unknown>;
  };
}

export interface RageClickEvent extends BaseEvent {
  type: 'rage_click';
  data: {
    selector: string;
  };
}

export interface DeadClickEvent extends BaseEvent {
  type: 'dead_click';
  data: {
    selector: string;
  };
}

export interface JsErrorEvent extends BaseEvent {
  type: 'js_error';
  data: {
    message: string;
    source?: string;
    lineno?: number;
    colno?: number;
  };
}

export interface QuickbackEvent extends BaseEvent {
  type: 'quickback';
  data: {
    url: string;
    timeSpentMs: number;
  };
}

export interface ExcessiveScrollEvent extends BaseEvent {
  type: 'excessive_scroll';
  data: {
    scrollY: number;
  };
}

export interface PageRefreshEvent extends BaseEvent {
  type: 'page_refresh_frustration';
  data: {
    path: string;
  };
}

export interface ScrollDepthEvent extends BaseEvent {
  type: 'scroll_depth';
  data: {
    maxDepth: number;
  };
}

export type AnalyticsEvent = 
  | PageViewEvent 
  | ClickEvent 
  | CustomEvent 
  | RageClickEvent 
  | DeadClickEvent 
  | JsErrorEvent 
  | QuickbackEvent 
  | ExcessiveScrollEvent 
  | PageRefreshEvent 
  | ScrollDepthEvent;

export interface HeatmapPoint {
  x: number;
  y: number;
  count: number;
  offsetX?: number;
  offsetY?: number;
  selector?: string;
}
