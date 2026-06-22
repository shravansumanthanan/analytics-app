import useSWR, { mutate } from 'swr';
import { useEffect } from 'react';
import { fetcher } from './client';
import { socket } from './socket';
import type { Session, AnalyticsEvent, HeatmapPoint } from './types';

// API Response interfaces
interface ApiResponse<T> {
  success: boolean;
  data: T;
}

/**
 * Hook to fetch all sessions
 */
export function useSessions() {
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<Session[]>>(
    '/sessions',
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
export function useHeatmap(url: string | null) {
  const encodedUrl = url ? encodeURIComponent(url) : null;
  const { data, error, isLoading, mutate } = useSWR<ApiResponse<HeatmapPoint[]>>(
    encodedUrl ? `/heatmap?url=${encodedUrl}` : null,
    fetcher
  );

  return {
    points: data?.data ?? [],
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
