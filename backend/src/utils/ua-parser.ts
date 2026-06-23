/**
 * Simple, high-performance regex-based User-Agent parser.
 * Categorizes devices into 'desktop', 'tablet', or 'mobile'.
 */
export function parseDeviceType(userAgent?: string): 'desktop' | 'tablet' | 'mobile' {
  if (!userAgent) return 'desktop';

  const ua = userAgent.toLowerCase();

  // Check for tablet first, as tablet UAs often contain mobile markers
  const isTablet = 
    /ipad|android(?!.*mobi)|tablet|playbook|silk/i.test(ua);
  if (isTablet) return 'tablet';

  const isMobile = 
    /mobi|iphone|ipod|blackberry|opera mini|iemobile|mobile|fennec|fennec|iemobile/i.test(ua);
  if (isMobile) return 'mobile';

  return 'desktop';
}

/**
 * Parses browser name from User-Agent.
 */
export function parseBrowser(userAgent?: string): string {
  if (!userAgent) return 'Unknown';
  const ua = userAgent.toLowerCase();
  
  if (ua.includes('firefox')) return 'Firefox';
  if (ua.includes('opr/') || ua.includes('opera')) return 'Opera';
  if (ua.includes('edg/')) return 'Edge';
  if (ua.includes('chrome') && !ua.includes('chromium')) return 'Chrome';
  if (ua.includes('safari') && !ua.includes('chrome')) return 'Safari';
  if (ua.includes('chromium')) return 'Chromium';
  
  return 'Other';
}
