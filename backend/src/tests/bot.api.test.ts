import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';
import { isBotUserAgent } from '../utils/bot-detector';

// Define mock data containing both bot and user data
const mockSessions = [
  { id: 'ses_human', sessionId: 'ses_human', visitorId: 'vis_1', userAgent: 'Chrome', firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString(), eventCount: 2, frustrationCount: 0, isBot: false },
  { id: 'ses_bot', sessionId: 'ses_bot', visitorId: 'vis_bot', userAgent: 'Googlebot', firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString(), eventCount: 1, frustrationCount: 0, isBot: true }
];

const mockEvents = [
  { _id: 'e1', sessionId: 'ses_human', visitorId: 'vis_1', projectId: 'proj_1', type: 'click', url: 'http://example.com', timestamp: new Date().toISOString(), userAgent: 'Chrome', isBot: false, data: { x: 100, y: 100 } },
  { _id: 'e2', sessionId: 'ses_bot', visitorId: 'vis_bot', projectId: 'proj_1', type: 'click', url: 'http://example.com', timestamp: new Date().toISOString(), userAgent: 'Googlebot', isBot: true, data: { x: 200, y: 200 } }
];

// Mock repositories to inspect the filters received
let lastSessionFilters: any = null;
let lastEventFilters: any = null;

vi.mock('../repositories/session.repository', () => {
  return {
    SessionRepository: class {
      findAll = vi.fn().mockImplementation((filters: any) => {
        lastSessionFilters = filters;
        // Simulating the default filtering behavior of MongoDB
        const filtered = mockSessions.filter(s => filters.includeBots === true ? true : !s.isBot);
        return Promise.resolve(filtered.map(s => ({
          id: s.sessionId,
          visitorId: s.visitorId,
          userAgent: s.userAgent,
          startedAt: s.firstSeen,
          lastActiveAt: s.lastSeen,
          eventCount: s.eventCount,
          frustrationCount: s.frustrationCount
        })));
      });
      findById = vi.fn().mockResolvedValue(null);
      upsertSession = vi.fn().mockResolvedValue(undefined);
    }
  };
});

vi.mock('../repositories/event.repository', () => {
  return {
    EventRepository: class {
      findClicksByUrl = vi.fn().mockImplementation((url: string, sessionId?: string, filters?: any) => {
        lastEventFilters = filters;
        const filtered = mockEvents.filter(e => {
          if (e.url !== url || e.type !== 'click') return false;
          if (filters?.includeBots === true) return true;
          return !e.isBot;
        });
        return Promise.resolve(filtered.map(e => ({
          x: e.data.x,
          y: e.data.y,
          count: 1
        })));
      });
    }
  };
});

const app = createApp();

describe('Bot / Crawler Ingestion & Query Filtering API', () => {
  describe('isBotUserAgent Detector Helper', () => {
    it('should accurately identify bot patterns', () => {
      expect(isBotUserAgent('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)')).toBe(true);
      expect(isBotUserAgent('Mozilla/5.0 (compatible; Bingbot/2.0; +http://www.bing.com/bingbot.htm)')).toBe(true);
      expect(isBotUserAgent('Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 (compatible; Google-Lighthouse)')).toBe(true);
      expect(isBotUserAgent('Playwright/1.22.0 (HeadlessChrome/102.0.5005.40)')).toBe(true);
      expect(isBotUserAgent('curl/7.64.1')).toBe(true);
    });

    it('should false-alarm regular desktop and mobile user agents', () => {
      expect(isBotUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36')).toBe(false);
      expect(isBotUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1')).toBe(false);
    });
  });

  describe('GET /api/sessions (Bot filtering)', () => {
    it('should exclude bots by default', async () => {
      const response = await request(app)
        .get('/api/sessions')
        .set('Authorization', 'Bearer supersecret');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe('ses_human');
      expect(lastSessionFilters.includeBots).toBe(false);
    });

    it('should return bot sessions when includeBots=true is queried', async () => {
      const response = await request(app)
        .get('/api/sessions')
        .query({ includeBots: 'true' })
        .set('Authorization', 'Bearer supersecret');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(lastSessionFilters.includeBots).toBe(true);
    });
  });

  describe('GET /api/heatmap (Bot filtering)', () => {
    it('should exclude bots by default in heatmaps', async () => {
      const response = await request(app)
        .get('/api/heatmap')
        .query({ url: 'http://example.com' })
        .set('Authorization', 'Bearer supersecret');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].x).toBe(100);
      expect(lastEventFilters.includeBots).toBeFalsy();
    });

    it('should include bot points when includeBots=true is requested', async () => {
      const response = await request(app)
        .get('/api/heatmap')
        .query({ url: 'http://example.com', includeBots: 'true' })
        .set('Authorization', 'Bearer supersecret');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(lastEventFilters.includeBots).toBe(true);
    });
  });
});
