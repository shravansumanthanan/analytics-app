export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

const getAuthToken = (): string => {
  let token = sessionStorage.getItem('admin_token');
  if (!token) {
    token = window.prompt('Enter Admin Password:');
    if (token) {
      sessionStorage.setItem('admin_token', token);
    }
  }
  return token || '';
};

/**
 * Generic API client using fetch
 */
export async function fetcher<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const token = getAuthToken();
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    sessionStorage.removeItem('admin_token');
    window.location.reload(); // Reload to trigger prompt again
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.message || `API Error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}
