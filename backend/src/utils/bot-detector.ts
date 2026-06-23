const BOT_UA_REGEX = /bot|crawler|spider|ping|google|slurp|lighthouse|headless|chrome-lighthouse|selenium|playwright|puppeteer|phantomjs|webdriver|curl|wget|httpclient|postman|axios|python|go-http-client|facebookexternalhit|twitterbot|baiduspider|yandexbot|bingbot/i;

/**
 * Checks if a given User-Agent string belongs to a bot or automated crawler.
 */
export function isBotUserAgent(userAgent?: string): boolean {
  if (!userAgent) return false;
  return BOT_UA_REGEX.test(userAgent);
}
