import { SessionRepository } from '../repositories/session.repository';
import { EventRepository } from '../repositories/event.repository';
import { RecordingRepository } from '../repositories/recording.repository';

export class SeedService {
  constructor(
    private sessionRepository: SessionRepository,
    private eventRepository: EventRepository,
    private recordingRepository: RecordingRepository
  ) {}

  async clearDemoData(): Promise<void> {
    await Promise.all([
      this.sessionRepository.clear(),
      this.eventRepository.clear(),
      this.recordingRepository.clear(),
    ]);
  }

  async seedDemoData(): Promise<{ sessionsCount: number; eventsCount: number; recordingsCount: number }> {
    await this.clearDemoData();

    const now = Date.now();
    const sessions = [
      {
        sessionId: 'demo_checkout_win',
        visitorId: 'visitor_001',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126 Safari/537.36',
        firstSeen: new Date(now - 8 * 60 * 1000),
        lastSeen: new Date(now - 90 * 1000),
        eventCount: 4,
        frustrationCount: 0,
        isBot: false,
        sessionDuration: 390,
        bounce: false,
        pageViewsCount: 2,
        deviceType: 'desktop',
        country: 'United States',
        region: 'California',
        city: 'San Francisco',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'demo_launch',
      },
      {
        sessionId: 'demo_pricing_stuck',
        visitorId: 'visitor_002',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
        firstSeen: new Date(now - 35 * 60 * 1000),
        lastSeen: new Date(now - 31 * 60 * 1000),
        eventCount: 3,
        frustrationCount: 1,
        isBot: false,
        sessionDuration: 240,
        bounce: false,
        pageViewsCount: 1,
        deviceType: 'mobile',
        country: 'India',
        region: 'Karnataka',
        city: 'Bengaluru',
        utmSource: 'newsletter',
        utmMedium: 'email',
        utmCampaign: 'demo_launch',
      },
      {
        sessionId: 'demo_bot',
        visitorId: 'bot_001',
        userAgent: 'Googlebot/2.1 (+http://www.google.com/bot.html)',
        firstSeen: new Date(now - 50 * 60 * 1000),
        lastSeen: new Date(now - 50 * 60 * 1000),
        eventCount: 1,
        frustrationCount: 0,
        isBot: true,
        sessionDuration: 0,
        bounce: true,
        pageViewsCount: 1,
        deviceType: 'desktop',
        country: 'United States',
        region: 'California',
        city: 'Mountain View',
      },
    ];

    const events = [
      this.createEvent('demo_checkout_win', 'visitor_001', 'page_view', 'http://localhost:3001/', now - 8 * 60 * 1000),
      this.createEvent('demo_checkout_win', 'visitor_001', 'click', 'http://localhost:3001/', now - 6 * 60 * 1000, {
        x: 420,
        y: 360,
        selector: 'button#add-to-cart',
        text: 'Add to cart',
      }),
      this.createEvent('demo_checkout_win', 'visitor_001', 'page_view', 'http://localhost:3001/checkout', now - 3 * 60 * 1000),
      this.createEvent('demo_checkout_win', 'visitor_001', 'custom', 'http://localhost:3001/checkout', now - 90 * 1000, {
        name: 'purchase_complete',
        value: 129,
      }),
      this.createEvent('demo_pricing_stuck', 'visitor_002', 'page_view', 'http://localhost:3001/pricing', now - 35 * 60 * 1000),
      this.createEvent('demo_pricing_stuck', 'visitor_002', 'click', 'http://localhost:3001/pricing', now - 34 * 60 * 1000, {
        x: 280,
        y: 720,
        selector: 'button#checkout',
        text: 'Checkout',
        isFrustrated: true,
      }),
      this.createEvent('demo_pricing_stuck', 'visitor_002', 'js_error', 'http://localhost:3001/pricing', now - 33 * 60 * 1000, {
        message: 'Payment widget failed to initialize',
      }),
      this.createEvent('demo_bot', 'bot_001', 'page_view', 'http://localhost:3001/', now - 50 * 60 * 1000, undefined, true),
    ];

    await Promise.all([
      this.sessionRepository.insertMany(sessions),
      this.eventRepository.insertMany(events),
      this.recordingRepository.insertMany([
        {
          sessionId: 'demo_checkout_win',
          events: [
            { type: 0, timestamp: now - 8 * 60 * 1000, data: {} },
            { type: 3, timestamp: now - 6 * 60 * 1000, data: { source: 2, type: 2, x: 420, y: 360 } },
          ],
        },
      ]),
    ]);

    return {
      sessionsCount: sessions.length,
      eventsCount: events.length,
      recordingsCount: 1,
    };
  }

  private createEvent(
    sessionId: string,
    visitorId: string,
    type: string,
    url: string,
    timestamp: number,
    data?: Record<string, unknown>,
    isBot = false,
  ) {
    return {
      sessionId,
      visitorId,
      projectId: 'demo_project_001',
      type,
      url,
      timestamp: new Date(timestamp),
      userAgent: isBot ? 'Googlebot/2.1 (+http://www.google.com/bot.html)' : 'Mozilla/5.0',
      isBot,
      data,
    };
  }
}
