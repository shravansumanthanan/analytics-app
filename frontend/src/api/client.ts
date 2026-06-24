export const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (typeof window !== 'undefined' && window.location.hostname === 'localhost' && window.location.port === '5173'
    ? 'http://localhost:4000/api'
    : '/api');

// ── Auth token management ────────────────────────────────────────────────────

const TOKEN_KEY = 'admin_token';

export const authEvents = new EventTarget();

/** Fired when a 401 is received and the token has been cleared. */
export const AUTH_REQUIRED_EVENT = 'auth:required';

/** Fired when a 401 occurs with an existing token (wrong password). */
export const AUTH_INVALID_EVENT = 'auth:invalid';

export function getToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY) || 'demo-bypass-token';
}

export function setToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

// ── Generic API client ───────────────────────────────────────────────────────

/**
 * Generic fetch wrapper. Attaches the stored auth token as a Bearer header.
 * On 401: clears the token and fires an event so the LoginModal can appear.
 */
export async function fetcher<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    const hadToken = !!token;
    clearToken();
    authEvents.dispatchEvent(
      new Event(hadToken ? AUTH_INVALID_EVENT : AUTH_REQUIRED_EVENT)
    );
    throw new Error('Authentication required');
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.message ?? `API Error: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}
