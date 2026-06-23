export interface GeoLocation {
  country: string;
  region: string;
  city: string;
}

/**
 * Deterministically maps an IP address to a realistic location.
 * This ensures that for local development and demo testing, we have
 * realistic-looking locations across the globe without making external HTTP requests.
 */
export function resolveIpLocation(ip: string): GeoLocation {
  const cleanIp = ip.trim().replace(/^::ffff:/, '');

  // Local/Private IPs get mapped deterministically based on their host part
  if (
    cleanIp === '127.0.0.1' ||
    cleanIp === '::1' ||
    cleanIp === 'localhost' ||
    cleanIp.startsWith('192.168.') ||
    cleanIp.startsWith('10.') ||
    cleanIp.startsWith('172.16.')
  ) {
    // Generate a simple hash from the IP or fallback to random
    let hash = 0;
    for (let i = 0; i < cleanIp.length; i++) {
      hash = (hash << 5) - hash + cleanIp.charCodeAt(i);
      hash |= 0; // Convert to 32bit integer
    }
    hash = Math.abs(hash);

    const mockLocations: GeoLocation[] = [
      { country: 'United States', region: 'California', city: 'Mountain View' },
      { country: 'United States', region: 'New York', city: 'New York' },
      { country: 'United Kingdom', region: 'England', city: 'London' },
      { country: 'Germany', region: 'Berlin', city: 'Berlin' },
      { country: 'India', region: 'Karnataka', city: 'Bengaluru' },
      { country: 'Canada', region: 'Ontario', city: 'Toronto' },
      { country: 'France', region: 'Île-de-France', city: 'Paris' },
      { country: 'Japan', region: 'Tokyo', city: 'Tokyo' },
      { country: 'Australia', region: 'New South Wales', city: 'Sydney' },
      { country: 'Brazil', region: 'São Paulo', city: 'São Paulo' },
    ];

    return mockLocations[hash % mockLocations.length];
  }

  // Simple deterministic resolver for public IPs (for demo consistency)
  let hash = 0;
  for (let i = 0; i < cleanIp.length; i++) {
    hash = (hash << 5) - hash + cleanIp.charCodeAt(i);
    hash |= 0;
  }
  hash = Math.abs(hash);

  const countries = ['United States', 'Canada', 'United Kingdom', 'Germany', 'France', 'India', 'Japan', 'Australia'];
  const regions: Record<string, string[]> = {
    'United States': ['California', 'New York', 'Texas', 'Washington'],
    'Canada': ['Ontario', 'British Columbia', 'Quebec'],
    'United Kingdom': ['England', 'Scotland', 'Wales'],
    'Germany': ['Berlin', 'Bavaria', 'Hamburg'],
    'France': ['Île-de-France', 'Provence-Alpes-Côte d\'Azur'],
    'India': ['Karnataka', 'Maharashtra', 'Delhi'],
    'Japan': ['Tokyo', 'Osaka', 'Kyoto'],
    'Australia': ['New South Wales', 'Victoria', 'Queensland'],
  };
  const cities: Record<string, string[]> = {
    'California': ['Mountain View', 'San Francisco', 'Los Angeles'],
    'New York': ['New York', 'Brooklyn', 'Buffalo'],
    'Texas': ['Austin', 'Houston', 'Dallas'],
    'Washington': ['Seattle', 'Tacoma', 'Bellevue'],
    'Ontario': ['Toronto', 'Ottawa'],
    'British Columbia': ['Vancouver', 'Victoria'],
    'Quebec': ['Montreal', 'Quebec City'],
    'England': ['London', 'Manchester', 'Birmingham'],
    'Scotland': ['Edinburgh', 'Glasgow'],
    'Wales': ['Cardiff', 'Swansea'],
    'Berlin': ['Berlin'],
    'Bavaria': ['Munich', 'Nuremberg'],
    'Hamburg': ['Hamburg'],
    'Île-de-France': ['Paris', 'Boulogne-Billancourt'],
    'Provence-Alpes-Côte d\'Azur': ['Marseille', 'Nice'],
    'Karnataka': ['Bengaluru', 'Mysuru'],
    'Maharashtra': ['Mumbai', 'Pune'],
    'Delhi': ['New Delhi', 'Dwarka'],
    'Tokyo': ['Tokyo', 'Shibuya', 'Shinjuku'],
    'Osaka': ['Osaka'],
    'Kyoto': ['Kyoto'],
    'New South Wales': ['Sydney', 'Newcastle'],
    'Victoria': ['Melbourne', 'Geelong'],
    'Queensland': ['Brisbane', 'Gold Coast'],
  };

  const country = countries[hash % countries.length];
  const regionList = regions[country] || ['Default Region'];
  const region = regionList[(hash >> 1) % regionList.length];
  const cityList = cities[region] || ['Default City'];
  const city = cityList[(hash >> 2) % cityList.length];

  return { country, region, city };
}
