import { Request, Response, NextFunction } from 'express';
import { SessionModel } from '../models/session.model';
import { EventModel } from '../models/event.model';
import { RecordingModel } from '../models/recording.model';

export class SeedController {
  /**
   * POST /api/clear
   * Clears all sessions, events, and recordings.
   */
  clear = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await Promise.all([
        SessionModel.deleteMany({}),
        EventModel.deleteMany({}),
        RecordingModel.deleteMany({}),
      ]);
      res.json({ success: true, message: 'Database cleared successfully.' });
    } catch (err) {
      next(err);
    }
  };

  /**
   * POST /api/seed
   * Populates the database with realistic mock telemetry and sessions.
   */
  seed = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Clear first to prevent duplication
      await Promise.all([
        SessionModel.deleteMany({}),
        EventModel.deleteMany({}),
        RecordingModel.deleteMany({}),
      ]);

      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
      const fourDaysAgo = new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000);
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);
      const sixDaysAgo = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);

      // Distribute seed data across days to make graphs look nice
      const days = [now, oneHourAgo, oneDayAgo, twoDaysAgo, threeDaysAgo, fourDaysAgo, fiveDaysAgo, sixDaysAgo];

      const sessionsData: any[] = [];
      const eventsData: any[] = [];
      const recordingsData: any[] = [];

      // ── SESSION 1: Converting User (USA, Chrome, Desktop, UTM) ───────────────────
      const s1Id = 'sess_01_usa_converting';
      const s1Start = new Date(days[2].getTime() - 10 * 60 * 1000); // 10 mins offset
      const s1End = new Date(s1Start.getTime() + 180 * 1000); // 3 mins duration
      
      sessionsData.push({
        sessionId: s1Id,
        visitorId: 'vis_usa_001',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        firstSeen: s1Start,
        lastSeen: s1End,
        eventCount: 9,
        frustrationCount: 0,
        isBot: false,
        sessionDuration: 180,
        bounce: false,
        pageViewsCount: 4,
        deviceType: 'desktop',
        country: 'United States',
        region: 'California',
        city: 'San Jose',
        utmSource: 'google',
        utmMedium: 'cpc',
        utmCampaign: 'blackfriday',
      });

      const s1Events = [
        { type: 'page_view', url: 'http://localhost:3001/', offset: 0, data: { title: 'Acme Corp - Home', referrer: 'https://google.com' } },
        { type: 'click', url: 'http://localhost:3001/', offset: 15, data: { selector: 'button#hero-cta-main', x: 220, y: 410, offsetX: 20, offsetY: 12, text: 'Get Started Now' } },
        { type: 'page_view', url: 'http://localhost:3001/pricing', offset: 17, data: { title: 'Acme Corp - Pricing', referrer: 'http://localhost:3001/' } },
        { type: 'scroll_depth', url: 'http://localhost:3001/pricing', offset: 45, data: { maxDepth: 75 } },
        { type: 'click', url: 'http://localhost:3001/pricing', offset: 60, data: { selector: 'button#pricing-pro-btn', x: 450, y: 820, offsetX: 45, offsetY: 10, text: 'Subscribe Pro' } },
        { type: 'page_view', url: 'http://localhost:3001/checkout', offset: 62, data: { title: 'Acme Corp - Checkout', referrer: 'http://localhost:3001/pricing' } },
        { type: 'click', url: 'http://localhost:3001/checkout', offset: 120, data: { selector: 'button#checkout-pay-btn', x: 620, y: 550, offsetX: 100, offsetY: 15, text: 'Submit Payment' } },
        { type: 'custom', url: 'http://localhost:3001/checkout', offset: 121, data: { name: 'subscribe', payload: { plan: 'pro', price: 49.99 } } },
        { type: 'page_view', url: 'http://localhost:3001/success', offset: 123, data: { title: 'Acme Corp - Success', referrer: 'http://localhost:3001/checkout' } }
      ];

      // ── SESSION 2: Frustrated User (UK, Safari, Mobile, Rage Clicks, Quickback) ──
      const s2Id = 'sess_02_uk_frustrated';
      const s2Start = new Date(days[1].getTime() - 2 * 60 * 1000);
      const s2End = new Date(s2Start.getTime() + 45 * 1000);
      
      sessionsData.push({
        sessionId: s2Id,
        visitorId: 'vis_uk_002',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        firstSeen: s2Start,
        lastSeen: s2End,
        eventCount: 8,
        frustrationCount: 3,
        isBot: false,
        sessionDuration: 45,
        bounce: false,
        pageViewsCount: 2,
        deviceType: 'mobile',
        country: 'United Kingdom',
        region: 'England',
        city: 'London',
        utmSource: 'twitter',
        utmMedium: 'social',
        utmCampaign: 'tweet-promo',
      });

      const s2Events = [
        { type: 'page_view', url: 'http://localhost:3001/', offset: 0, data: { title: 'Acme Corp - Home', referrer: 'https://t.co/' } },
        { type: 'click', url: 'http://localhost:3001/', offset: 10, data: { selector: 'a#nav-signup-btn', x: 340, y: 45, offsetX: 12, offsetY: 8, text: 'Sign Up' } },
        { type: 'page_view', url: 'http://localhost:3001/signup', offset: 12, data: { title: 'Acme Corp - Register', referrer: 'http://localhost:3001/' } },
        { type: 'click', url: 'http://localhost:3001/signup', offset: 25, data: { selector: 'button#submit-register', x: 180, y: 440, offsetX: 40, offsetY: 15, text: 'Register Account' } },
        { type: 'rage_click', url: 'http://localhost:3001/signup', offset: 26, data: { selector: 'button#submit-register' } },
        { type: 'dead_click', url: 'http://localhost:3001/signup', offset: 28, data: { selector: 'img#signup-banner' } },
        { type: 'quickback', url: 'http://localhost:3001/signup', offset: 30, data: { url: 'http://localhost:3001/signup', timeSpentMs: 18000 } },
        { type: 'page_view', url: 'http://localhost:3001/', offset: 31, data: { title: 'Acme Corp - Home', referrer: 'http://localhost:3001/signup' } }
      ];

      // ── SESSION 3: Javascript Error & Technical Fail (Japan, Firefox) ────────────
      const s3Id = 'sess_03_jp_error';
      const s3Start = new Date(days[3].getTime() - 15 * 60 * 1000);
      const s3End = new Date(s3Start.getTime() + 120 * 1000);
      
      sessionsData.push({
        sessionId: s3Id,
        visitorId: 'vis_jp_003',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:126.0) Gecko/20100101 Firefox/126.0',
        firstSeen: s3Start,
        lastSeen: s3End,
        eventCount: 4,
        frustrationCount: 1,
        isBot: false,
        sessionDuration: 120,
        bounce: false,
        pageViewsCount: 2,
        deviceType: 'desktop',
        country: 'Japan',
        region: 'Tokyo',
        city: 'Tokyo',
        utmSource: 'direct',
        utmMedium: 'none',
        utmCampaign: 'none',
      });

      const s3Events = [
        { type: 'page_view', url: 'http://localhost:3001/', offset: 0, data: { title: 'Acme Corp - Home', referrer: '' } },
        { type: 'click', url: 'http://localhost:3001/', offset: 40, data: { selector: 'button#hero-cta-secondary', x: 380, y: 410, offsetX: 35, offsetY: 12, text: 'Read Documentation' } },
        { type: 'page_view', url: 'http://localhost:3001/docs', offset: 43, data: { title: 'Acme Corp - Documentation', referrer: 'http://localhost:3001/' } },
        { type: 'js_error', url: 'http://localhost:3001/docs', offset: 90, data: { message: "TypeError: Cannot read properties of undefined (reading 'map') at setupLayout (docs.js:42:18)", source: 'http://localhost:3001/docs.js', lineno: 42, colno: 18 } }
      ];

      // ── SESSION 4: Excessive Scroll / Hunt (Germany, Edge) ────────────────────────
      const s4Id = 'sess_04_de_hunt';
      const s4Start = new Date(days[4].getTime() - 40 * 60 * 1000);
      const s4End = new Date(s4Start.getTime() + 240 * 1000);

      sessionsData.push({
        sessionId: s4Id,
        visitorId: 'vis_de_004',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36 Edg/125.0.0.0',
        firstSeen: s4Start,
        lastSeen: s4End,
        eventCount: 5,
        frustrationCount: 2,
        isBot: false,
        sessionDuration: 240,
        bounce: false,
        pageViewsCount: 2,
        deviceType: 'desktop',
        country: 'Germany',
        region: 'Berlin',
        city: 'Berlin',
        utmSource: 'facebook',
        utmMedium: 'paid',
        utmCampaign: 'lead-gen',
      });

      const s4Events = [
        { type: 'page_view', url: 'http://localhost:3001/', offset: 0, data: { title: 'Acme Corp - Home', referrer: 'https://facebook.com/' } },
        { type: 'page_view', url: 'http://localhost:3001/blog/metrics-guide', offset: 15, data: { title: 'Acme Corp - Blog', referrer: 'http://localhost:3001/' } },
        { type: 'excessive_scroll', url: 'http://localhost:3001/blog/metrics-guide', offset: 60, data: { scrollY: 1520 } },
        { type: 'page_refresh_frustration', url: 'http://localhost:3001/blog/metrics-guide', offset: 120, data: { path: '/blog/metrics-guide' } },
        { type: 'scroll_depth', url: 'http://localhost:3001/blog/metrics-guide', offset: 230, data: { maxDepth: 100 } }
      ];

      // ── SESSION 5: Fast Bouncer Mobile (Canada, Chrome Mobile) ────────────────────
      const s5Id = 'sess_05_ca_bounce';
      const s5Start = new Date(days[5].getTime() - 25 * 60 * 1000);
      const s5End = new Date(s5Start.getTime() + 4 * 1000);

      sessionsData.push({
        sessionId: s5Id,
        visitorId: 'vis_ca_005',
        userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        firstSeen: s5Start,
        lastSeen: s5End,
        eventCount: 1,
        frustrationCount: 0,
        isBot: false,
        sessionDuration: 4,
        bounce: true,
        pageViewsCount: 1,
        deviceType: 'mobile',
        country: 'Canada',
        region: 'Ontario',
        city: 'Toronto',
        utmSource: 'direct',
        utmMedium: 'none',
        utmCampaign: 'none',
      });

      const s5Events = [
        { type: 'page_view', url: 'http://localhost:3001/', offset: 0, data: { title: 'Acme Corp - Home', referrer: '' } }
      ];

      // ── SESSION 6: Bot crawler (USA, Googlebot) ───────────────────────────────────
      const s6Id = 'sess_06_bot';
      const s6Start = new Date(days[6].getTime() - 50 * 60 * 1000);
      const s6End = new Date(s6Start.getTime() + 5 * 1000);

      sessionsData.push({
        sessionId: s6Id,
        visitorId: 'vis_bot_006',
        userAgent: 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
        firstSeen: s6Start,
        lastSeen: s6End,
        eventCount: 2,
        frustrationCount: 0,
        isBot: true,
        sessionDuration: 5,
        bounce: true,
        pageViewsCount: 2,
        deviceType: 'desktop',
        country: 'United States',
        region: 'Oregon',
        city: 'The Dalles',
        utmSource: 'direct',
        utmMedium: 'none',
        utmCampaign: 'none',
      });

      const s6Events = [
        { type: 'page_view', url: 'http://localhost:3001/', offset: 0, data: { title: 'Acme Corp - Home', referrer: '' } },
        { type: 'page_view', url: 'http://localhost:3001/robots.txt', offset: 3, data: { title: 'Robots.txt', referrer: '' } }
      ];

      // ── SESSION 7: Active Live Session (Australia, macOS, Chrome) ─────────────────
      const s7Id = 'sess_07_au_active_live';
      const s7Start = new Date(now.getTime() - 25 * 1000); // started 25 seconds ago
      const s7End = now;

      sessionsData.push({
        sessionId: s7Id,
        visitorId: 'vis_au_007',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        firstSeen: s7Start,
        lastSeen: s7End,
        eventCount: 2,
        frustrationCount: 0,
        isBot: false,
        sessionDuration: 25,
        bounce: false,
        pageViewsCount: 1,
        deviceType: 'desktop',
        country: 'Australia',
        region: 'New South Wales',
        city: 'Sydney',
        utmSource: 'linkedin',
        utmMedium: 'social',
        utmCampaign: 'hiring',
      });

      const s7Events = [
        { type: 'page_view', url: 'http://localhost:3001/', offset: 0, data: { title: 'Acme Corp - Home', referrer: 'https://linkedin.com/' } },
        { type: 'click', url: 'http://localhost:3001/', offset: 15, data: { selector: 'a#nav-signup-btn', x: 920, y: 45, offsetX: 15, offsetY: 10, text: 'Sign Up' } }
      ];

      // ── SESSIONS 8-15: Background sessions to populate top charts & demographics ─────
      const countries = [
        { country: 'France', region: 'Île-de-France', city: 'Paris', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari/604.1', device: 'mobile' },
        { country: 'India', region: 'Karnataka', city: 'Bengaluru', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:125.0) Gecko/20100101 Firefox/125.0', device: 'desktop' },
        { country: 'Brazil', region: 'São Paulo', city: 'São Paulo', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36', device: 'desktop' },
        { country: 'Canada', region: 'Quebec', city: 'Montreal', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) AppleWebKit/605.1.15 Mobile Safari/604.1', device: 'mobile' },
        { country: 'United States', region: 'New York', city: 'New York', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36', device: 'desktop' },
        { country: 'France', region: 'Provence-Alpes-Côte d\'Azur', city: 'Marseille', userAgent: 'Mozilla/5.0 (Android 13; Mobile) Chrome/123.0.0.0', device: 'mobile' },
        { country: 'India', region: 'Maharashtra', city: 'Mumbai', userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5) AppleWebKit/605.1.15 Safari/605.1.15', device: 'desktop' },
        { country: 'United States', region: 'Texas', city: 'Austin', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36', device: 'desktop' },
      ];

      countries.forEach((loc, idx) => {
        const id = `sess_bg_0${idx + 8}`;
        const startDay = days[(idx + 1) % days.length];
        const duration = 20 + Math.round(Math.random() * 150); // 20s to 170s
        const start = new Date(startDay.getTime() - Math.round(Math.random() * 12 * 60 * 60 * 1000));
        const end = new Date(start.getTime() + duration * 1000);
        const pvCount = 1 + Math.floor(Math.random() * 3);

        const utms = [
          { s: 'google', m: 'organic', c: 'none' },
          { s: 'newsletter', m: 'email', c: 'weekly_42' },
          { s: 'direct', m: 'none', c: 'none' },
          { s: 'github', m: 'referral', c: 'readme' }
        ];
        const utm = utms[idx % utms.length];

        sessionsData.push({
          sessionId: id,
          visitorId: `vis_bg_00${idx + 8}`,
          userAgent: loc.userAgent,
          firstSeen: start,
          lastSeen: end,
          eventCount: pvCount * 2,
          frustrationCount: idx % 4 === 0 ? 1 : 0,
          isBot: false,
          sessionDuration: duration,
          bounce: pvCount === 1 && duration < 10,
          pageViewsCount: pvCount,
          deviceType: loc.device,
          country: loc.country,
          region: loc.region,
          city: loc.city,
          utmSource: utm.s,
          utmMedium: utm.m,
          utmCampaign: utm.c,
        });

        // Add page view events
        const paths = ['/', '/pricing', '/features', '/blog/metrics-guide'];
        for (let p = 0; p < pvCount; p++) {
          const path = paths[p % paths.length];
          const pvOffset = Math.round((duration / pvCount) * p);
          
          eventsData.push({
            sessionId: id,
            visitorId: `vis_bg_00${idx + 8}`,
            projectId: 'demo_project_001',
            type: 'page_view',
            url: `http://localhost:3001${path}`,
            timestamp: new Date(start.getTime() + pvOffset * 1000),
            userAgent: loc.userAgent,
            isBot: false,
            data: { title: `Page ${path}`, referrer: p === 0 ? 'https://google.com' : `http://localhost:3001${paths[p-1]}` },
            country: loc.country,
            region: loc.region,
            city: loc.city,
            utmSource: utm.s,
            utmMedium: utm.m,
            utmCampaign: utm.c,
            deviceType: loc.device,
          });

          // Add click events on pages
          if (Math.random() > 0.4) {
            const clickOffset = pvOffset + 3 + Math.round(Math.random() * 5);
            const selector = path === '/' ? 'button#hero-cta-main' : 'button.btn-outline';
            
            // Add dead clicks or rage clicks to some background sessions
            const clickType = (idx % 4 === 0 && p === 0) ? 'rage_click' : 'click';
            
            eventsData.push({
              sessionId: id,
              visitorId: `vis_bg_00${idx + 8}`,
              projectId: 'demo_project_001',
              type: clickType,
              url: `http://localhost:3001${path}`,
              timestamp: new Date(start.getTime() + clickOffset * 1000),
              userAgent: loc.userAgent,
              isBot: false,
              data: { selector, x: 200 + Math.round(Math.random() * 100), y: 400 + Math.round(Math.random() * 100), offsetX: 10, offsetY: 5, text: 'Click Link', isFrustrated: clickType === 'rage_click' },
              country: loc.country,
              region: loc.region,
              city: loc.city,
              utmSource: utm.s,
              utmMedium: utm.m,
              utmCampaign: utm.c,
              deviceType: loc.device,
            });
          }
        }
      });

      // ── Process structured events for S1, S2, S3, S4, S5, S6, S7 ─────────────────
      const mapRawEvents = (sessId: string, startT: Date, visitorId: string, userAgent: string, isBot: boolean, loc: any, utm: any, rawEvents: any[]) => {
        rawEvents.forEach(e => {
          eventsData.push({
            sessionId: sessId,
            visitorId,
            projectId: 'demo_project_001',
            type: e.type,
            url: e.url,
            timestamp: new Date(startT.getTime() + e.offset * 1000),
            userAgent,
            isBot,
            data: e.data,
            deviceType: userAgent.includes('Mobile') ? 'mobile' : 'desktop',
            country: loc.country,
            region: loc.region,
            city: loc.city,
            utmSource: utm.utmSource,
            utmMedium: utm.utmMedium,
            utmCampaign: utm.utmCampaign,
          });
        });
      };

      const s1 = sessionsData[0];
      mapRawEvents(s1Id, s1Start, s1.visitorId, s1.userAgent, s1.isBot, s1, s1, s1Events);

      const s2 = sessionsData[1];
      mapRawEvents(s2Id, s2Start, s2.visitorId, s2.userAgent, s2.isBot, s2, s2, s2Events);

      const s3 = sessionsData[2];
      mapRawEvents(s3Id, s3Start, s3.visitorId, s3.userAgent, s3.isBot, s3, s3, s3Events);

      const s4 = sessionsData[3];
      mapRawEvents(s4Id, s4Start, s4.visitorId, s4.userAgent, s4.isBot, s4, s4, s4Events);

      const s5 = sessionsData[4];
      mapRawEvents(s5Id, s5Start, s5.visitorId, s5.userAgent, s5.isBot, s5, s5, s5Events);

      const s6 = sessionsData[5];
      mapRawEvents(s6Id, s6Start, s6.visitorId, s6.userAgent, s6.isBot, s6, s6, s6Events);

      const s7 = sessionsData[6];
      mapRawEvents(s7Id, s7Start, s7.visitorId, s7.userAgent, s7.isBot, s7, s7, s7Events);

      // ── Seed Recordings ──────────────────────────────────────────────────────────
      // Populate simple mock rrweb event timelines for detailed player inspection
      const mockRrwebTimeline = (sessId: string, startT: Date, durationSec: number) => {
        const eventsList: any[] = [];
        
        // 1. rrweb init metadata event
        eventsList.push({
          type: 4,
          data: { href: 'http://localhost:3001/', width: 1200, height: 800 },
          timestamp: startT.getTime(),
        });
        
        // 2. rrweb full snapshot event (basic mock DOM tree structure)
        eventsList.push({
          type: 2,
          data: {
            node: {
              type: 0,
              childNodes: [
                {
                  type: 1,
                  name: 'html',
                  publicId: '',
                  systemId: '',
                  childNodes: [
                    { type: 1, name: 'head', childNodes: [] },
                    {
                      type: 1,
                      name: 'body',
                      childNodes: [
                        {
                          type: 1,
                          name: 'div',
                          attributes: { id: 'root', style: 'padding: 40px; font-family: sans-serif;' },
                          childNodes: [
                            { type: 3, textContent: 'Mock rrweb In-Browser Session Replay' }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },
            initialOffset: { left: 0, top: 0 }
          },
          timestamp: startT.getTime() + 100,
        });

        // 3. rrweb mouse move increments
        for (let i = 1; i <= durationSec; i += 5) {
          eventsList.push({
            type: 3,
            data: {
              source: 1,
              positions: [
                { x: 100 + Math.round(Math.random() * 800), y: 100 + Math.round(Math.random() * 600), id: 4, timeOffset: 0 }
              ]
            },
            timestamp: startT.getTime() + i * 1000,
          });
        }

        // 4. rrweb viewport resize
        eventsList.push({
          type: 3,
          data: { source: 4, width: 1200, height: 800 },
          timestamp: startT.getTime() + 200,
        });

        recordingsData.push({
          sessionId: sessId,
          events: eventsList,
          createdAt: startT,
        });
      };

      // Generate recordings for our principal detailed sessions
      mockRrwebTimeline(s1Id, s1Start, 180);
      mockRrwebTimeline(s2Id, s2Start, 45);
      mockRrwebTimeline(s3Id, s3Start, 120);
      mockRrwebTimeline(s4Id, s4Start, 240);
      mockRrwebTimeline(s7Id, s7Start, 25);

      // Insert all records into MongoDB
      await Promise.all([
        SessionModel.insertMany(sessionsData),
        EventModel.insertMany(eventsData),
        RecordingModel.insertMany(recordingsData),
      ]);

      res.json({
        success: true,
        message: 'Database seeded with 15 sessions and event timelines successfully.',
        counts: {
          sessions: sessionsData.length,
          events: eventsData.length,
          recordings: recordingsData.length,
        }
      });
    } catch (err) {
      next(err);
    }
  };
}
