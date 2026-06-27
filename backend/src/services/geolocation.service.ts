export interface GeoLocation {
  country: string;
  region: string;
  city: string;
}

export function resolveIpLocation(ip: string): GeoLocation {
  const locations: GeoLocation[] = [
    { country: 'United States', region: 'California', city: 'San Francisco' },
    { country: 'United Kingdom', region: 'England', city: 'London' },
    { country: 'Germany', region: 'Berlin', city: 'Berlin' },
    { country: 'India', region: 'Karnataka', city: 'Bengaluru' },
    { country: 'Japan', region: 'Tokyo', city: 'Tokyo' },
    { country: 'Australia', region: 'New South Wales', city: 'Sydney' },
  ];

  let hash = 0;
  for (const char of ip.trim().replace(/^::ffff:/, '')) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }

  return locations[Math.abs(hash) % locations.length];
}
