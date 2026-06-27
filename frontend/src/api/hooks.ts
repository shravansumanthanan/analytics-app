import useSWR, { mutate } from 'swr';
import { useEffect } from 'react';
import { fetcher } from './client';
import { socket } from './socket';
import type { Session, AnalyticsEvent } from './types';

// Funnel interfaces
export interface Funnel {
  _id: string;
  name: string;
  steps: string[];
  createdAt: string;
}

export interface FunnelStepResult {
  url: string;
  sessions: number;
  conversionRate: number;
  dropoffRate: number;
}

// API Response interfaces
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

function toQueryString(params: Record<string, string | number | boolean | null | undefined>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === false || value === 'all') continue;
    search.append(key, value === true ? 'true' : String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : '';
}

/**
 * Hook to fetch all sessions
 */
export interface SessionFilters {
  startDate?: string;
  endDate?: string;
  device?: 'mobile' | 'desktop' | 'all';
  frustratedOnly?: boolean;
  visitedPath?: string;
  clickedSelector?: string;
  hasError?: boolean;
  customEvent?: string;
  includeBots?: boolean;
}

export function useSessions(filters?: SessionFilters) {
  const queryString = toQueryString({
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    device: filters?.device,
    frustratedOnly: filters?.frustratedOnly,
    visitedPath: filters?.visitedPath,
    clickedSelector: filters?.clickedSelector,
    hasError: filters?.hasError,
    customEvent: filters?.customEvent,
    includeBots: filters?.includeBots,
  });

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<Session[]>>(
    `/sessions${queryString}`,
    fetcher
  );

  return {
    sessions: data?.data ?? [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Hook to fetch recording events for a session
 */
export function useSessionRecording(sessionId: string | null) {
  const { data, error, isLoading } = useSWR<ApiResponse<any[]>>(
    sessionId ? `/sessions/${sessionId}/recording` : null,
    fetcher
  );

  return {
    recordingEvents: data?.data ?? [],
    isLoading,
    isError: !!error,
  };
}

/**
 * Hook to fetch events for a specific session
 */
export function useSessionEvents(sessionId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<AnalyticsEvent[]>>(
    sessionId ? `/sessions/${sessionId}/events` : null,
    fetcher
  );

  return {
    events: data?.data ?? [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Hook to fetch all tracked URLs (for heatmap selection)
 */
export function useTrackedUrls() {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<string[]>>(
    '/heatmap/urls',
    fetcher
  );

  return {
    urls: data?.data ?? [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Hook to fetch heatmap data for a specific URL
 */
export interface HeatmapFilters {
  type?: 'click' | 'attention';
  sessionId?: string | null;
  convertedOnly?: boolean;
  conversionPath?: string;
  conversionEvent?: string;
  includeBots?: boolean;
}

export function useHeatmap(url: string | null, filters?: HeatmapFilters) {
  const queryString = toQueryString({
    url,
    type: filters?.type,
    sessionId: filters?.sessionId,
    convertedOnly: filters?.convertedOnly,
    conversionPath: filters?.conversionPath,
    conversionEvent: filters?.conversionEvent,
    includeBots: filters?.includeBots,
  });
  const queryUrl = url ? `/heatmap${queryString}` : null;

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<any>>(
    queryUrl,
    fetcher
  );

  return {
    points: data?.data ?? null,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Hook to listen for live events via WebSocket and invalidate caches
 */
export function useLiveEvents() {
  useEffect(() => {
    function onNewEvents() {
      // Invalidate all session lists and event lists so they refetch automatically
      mutate(
        (key) => typeof key === 'string' && (key === '/sessions' || key.startsWith('/sessions/')),
        undefined, // don't mutate local data, just refetch
        { revalidate: true }
      );
    }

    socket.on('new-events', onNewEvents);

    return () => {
      socket.off('new-events', onNewEvents);
    };
  }, []);
}

/**
 * Hook to fetch all funnels
 */
export function useFunnels() {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<Funnel[]>>(
    '/funnels',
    fetcher
  );

  return {
    funnels: data?.data ?? [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

/**
 * Hook to analyze a specific funnel
 */
export function useFunnelAnalysis(funnelId: string | null, filters?: SessionFilters) {
  const queryString = toQueryString({
    startDate: filters?.startDate,
    endDate: filters?.endDate,
    device: filters?.device,
    frustratedOnly: filters?.frustratedOnly,
  });

  const { data, error, isLoading, mutate } = useSWR<ApiResponse<{ steps: FunnelStepResult[] }>>(
    funnelId ? `/funnels/${funnelId}/analysis${queryString}` : null,
    fetcher
  );

  return {
    analysis: data?.data,
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export interface User {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  createdAt: string;
}

export function useUsers() {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<User[]>>(
    '/users',
    fetcher
  );

  return {
    users: data?.data ?? [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export interface Annotation {
  _id: string;
  sessionId: string;
  timestampMs: number;
  absoluteTimestamp: string;
  note: string;
  author: string;
  createdAt: string;
}

export function useAnnotations(sessionId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<Annotation[]>>(
    sessionId ? `/sessions/${sessionId}/annotations` : null,
    fetcher
  );

  return {
    annotations: data?.data ?? [],
    isLoading,
    isError: !!error,
    error,
    mutate,
  };
}

export interface ExportEvent {
  eventId: string;
  sessionId: string;
  visitorId: string;
  projectId: string;
  type: string;
  url: string;
  timestamp: string;
  userAgent: string;
  selector: string;
  text: string;
  isFrustrated: boolean;
  errorMessage: string;
  scrollY: number;
  maxDepth: number;
}

export function useEventsList(filters?: { page?: number; limit?: number }) {
  const queryString = toQueryString({
    page: filters?.page,
    limit: filters?.limit,
  });

  const { data, error, isLoading, mutate } = useSWR<{ success: boolean; data: ExportEvent[]; total: number }>(
    `/export/events${queryString}`,
    fetcher
  );

  return {
    events: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    isError: !!error,
    mutate,
  };
}
