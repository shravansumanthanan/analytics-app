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
  const params = new URLSearchParams();
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  if (filters?.device && filters.device !== 'all') params.append('device', filters.device);
  if (filters?.frustratedOnly) params.append('frustratedOnly', 'true');
  if (filters?.visitedPath) params.append('visitedPath', filters.visitedPath);
  if (filters?.clickedSelector) params.append('clickedSelector', filters.clickedSelector);
  if (filters?.hasError) params.append('hasError', 'true');
  if (filters?.customEvent) params.append('customEvent', filters.customEvent);
  if (filters?.includeBots) params.append('includeBots', 'true');

  const queryString = params.toString() ? `?${params.toString()}` : '';

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
  const encodedUrl = url ? encodeURIComponent(url) : null;
  
  const params = new URLSearchParams();
  if (url) params.append('url', url);
  if (filters?.type) params.append('type', filters.type);
  if (filters?.sessionId) params.append('sessionId', filters.sessionId);
  if (filters?.convertedOnly) params.append('convertedOnly', 'true');
  if (filters?.conversionPath) params.append('conversionPath', filters.conversionPath);
  if (filters?.conversionEvent) params.append('conversionEvent', filters.conversionEvent);
  if (filters?.includeBots) params.append('includeBots', 'true');

  const queryUrl = encodedUrl ? `/heatmap?${params.toString()}` : null;

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
  const params = new URLSearchParams();
  if (filters?.startDate) params.append('startDate', filters.startDate);
  if (filters?.endDate) params.append('endDate', filters.endDate);
  if (filters?.device && filters.device !== 'all') params.append('device', filters.device);
  if (filters?.frustratedOnly) params.append('frustratedOnly', 'true');

  const queryString = params.toString() ? `?${params.toString()}` : '';

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
  const params = new URLSearchParams();
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));
  const queryString = params.toString() ? `?${params.toString()}` : '';

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
