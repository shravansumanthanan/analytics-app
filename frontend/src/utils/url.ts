/**
 * Formats a full URL string into a clean relative path (pathname + search).
 * If the URL is invalid or parsing fails, returns the original string.
 */
export function formatRelativeUrl(urlStr: string): string {
  if (!urlStr) return '/';
  try {
    const url = new URL(urlStr);
    return url.pathname + url.search || '/';
  } catch {
    return urlStr;
  }
}
