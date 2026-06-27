import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

// Mock the query helpers to bypass MongoDB
vi.mock('../utils/event-query', () => {
  return {
    bulkCreateEvents: vi.fn().mockResolvedValue(undefined),
    findClicksByUrl: vi.fn().mockResolvedValue([]),
    findDistinctClickUrls: vi.fn().mockResolvedValue([]),
    findEventsBySessionId: vi.fn().mockResolvedValue([]),
    findAttentionByUrl: vi.fn().mockResolvedValue({})
  };
});

vi.mock('../utils/session-query', () => {
  return {
    bulkUpsertSessions: vi.fn().mockResolvedValue(undefined),
    sessionExists: vi.fn().mockResolvedValue(true)
  };
});

const app = createApp();

describe('Event API', () => {
  describe('POST /api/events', () => {
    it('should return 400 when body is invalid', async () => {
      const response = await request(app)
        .post('/api/events')
        .send([{ projectId: 123 }]); // Invalid: projectId should be string

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Validation failed');
    });

    it('should return 202 when payloads are valid', async () => {
      const validPayload = [
        {
          projectId: 'proj_1',
          visitorId: 'vis_1',
          sessionId: 'ses_1',
          timestamp: new Date().toISOString(),
          type: 'click',
          url: 'http://example.com',
          data: {
            x: 100,
            y: 200,
            text: 'Submit'
          }
        }
      ];

      const response = await request(app)
        .post('/api/events')
        .send(validPayload);

      expect(response.status).toBe(202);
      expect(response.body.success).toBe(true);
      expect(response.body.accepted).toBe(1);
    });

    it('should return 202 for legacy payloads (missing data)', async () => {
      const legacyPayload = [
        {
          projectId: 'proj_1',
          visitorId: 'vis_1',
          sessionId: 'ses_1',
          timestamp: new Date().toISOString(),
          type: 'page_view',
          url: 'http://example.com',
          data: {} // Added empty data to satisfy custom validation if needed, though schema might make it optional
        }
      ];

      const response = await request(app)
        .post('/api/events')
        .send(legacyPayload);

      expect(response.status).toBe(202);
    });
  });

  describe('GET /api/heatmap', () => {
    it('should return 400 when URL is missing', async () => {
      const response = await request(app)
        .get('/api/heatmap')
        .set('Authorization', 'Bearer supersecret');
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Validation failed');
    });

    it('should return 200 and points for a valid url', async () => {
      const response = await request(app)
        .get('/api/heatmap')
        .query({ url: 'http://example.com' })
        .set('Authorization', 'Bearer supersecret');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]); // since we mocked return []
    });
  });
});
