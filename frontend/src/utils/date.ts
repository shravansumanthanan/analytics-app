/**
 * Formats a Date as a relative time string (e.g. "3 minutes ago", "just now").
 * ponytail: native platform relative time implementation instead of date-fns dependency
 */
export function formatDistanceToNow(date: Date, options?: { addSuffix?: boolean }): string {
  const ms = Date.now() - date.getTime();
  const sec = Math.round(ms / 1000);
  const min = Math.round(sec / 60);
  const hr = Math.round(min / 60);
  const day = Math.round(hr / 24);

  const suffix = options?.addSuffix ? ' ago' : '';
  const prefix = options?.addSuffix && sec < 0 ? 'in ' : '';

  if (Math.abs(sec) < 5) return 'just now';
  if (Math.abs(sec) < 60) return sec > 0 ? `${sec} seconds${suffix}` : `${prefix}${Math.abs(sec)} seconds`;
  if (Math.abs(min) < 60) return min > 0 ? `${min} minute${min !== 1 ? 's' : ''}${suffix}` : `${prefix}${Math.abs(min)} minute${Math.abs(min) !== 1 ? 's' : ''}`;
  if (Math.abs(hr) < 24) return hr > 0 ? `${hr} hour${hr !== 1 ? 's' : ''}${suffix}` : `${prefix}${Math.abs(hr)} hour${Math.abs(hr) !== 1 ? 's' : ''}`;
  return day > 0 ? `${day} day${day !== 1 ? 's' : ''}${suffix}` : `${prefix}${Math.abs(day)} day${Math.abs(day) !== 1 ? 's' : ''}`;
}

/**
 * Formats a date using native tools similar to date-fns format.
 * ponytail: native time formatting helper
 */
export function format(date: Date, formatStr: string): string {
  if (formatStr === 'HH:mm:ss.SSS') {
    const pad = (n: number, size = 2) => String(n).padStart(size, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(date.getMilliseconds(), 3)}`;
  }
  if (formatStr === 'HH:mm:ss') {
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  }
  if (formatStr === 'MMM dd, HH:mm') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${months[date.getMonth()]} ${pad(date.getDate())}, ${pad(date.getHours())}:${pad(date.getMinutes())}`;
  }
  return date.toISOString();
}
