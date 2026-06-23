import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

// Define mock data containers so we can inspect or control them in tests
const mockUsers = [
  { _id: 'u1', name: 'Alice Smith', email: 'alice@example.com', role: 'admin', createdAt: new Date().toISOString() },
  { _id: 'u2', name: 'Bob Jones', email: 'bob@example.com', role: 'member', createdAt: new Date().toISOString() }
];

const mockAnnotations = [
  { _id: 'a1', sessionId: 'ses_1', timestampMs: 1200, note: 'Rage click here', author: 'Alice', createdAt: new Date().toISOString() }
];

const mockSessions = [
  { id: 'ses_1', sessionId: 'ses_1', visitorId: 'vis_1', userAgent: 'Chrome', firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString(), eventCount: 15, frustrationCount: 2 }
];

const mockEvents = [
  { _id: 'e1', sessionId: 'ses_1', visitorId: 'vis_1', projectId: 'proj_1', type: 'click', url: 'http://example.com', timestamp: new Date().toISOString(), userAgent: 'Chrome', data: { selector: 'button#pay', text: 'Pay Now', isFrustrated: false } }
];

// Mock the repositories
vi.mock('../repositories/user.repository', () => {
  return {
    UserRepository: class {
      findAll = vi.fn().mockImplementation(() => Promise.resolve(mockUsers));
      findByEmail = vi.fn().mockImplementation((email: string) => {
        const found = mockUsers.find(u => u.email === email);
        return Promise.resolve(found || null);
      });
      create = vi.fn().mockImplementation((userData: any) => Promise.resolve({ _id: 'u_new', ...userData, createdAt: new Date().toISOString() }));
      delete = vi.fn().mockImplementation((id: string) => {
        if (id === 'u_nonexistent') return Promise.resolve(false);
        return Promise.resolve(true);
      });
    }
  };
});

vi.mock('../repositories/annotation.repository', () => {
  return {
    AnnotationRepository: class {
      create = vi.fn().mockImplementation((data: any) => Promise.resolve({ _id: 'a_new', ...data, createdAt: new Date().toISOString() }));
      findBySessionId = vi.fn().mockImplementation((sessionId: string) => {
        return Promise.resolve(mockAnnotations.filter(a => a.sessionId === sessionId));
      });
      delete = vi.fn().mockImplementation((id: string) => {
        if (id === 'a_nonexistent') return Promise.resolve(false);
        return Promise.resolve(true);
      });
    }
  };
});

vi.mock('../repositories/session.repository', () => {
  return {
    SessionRepository: class {
      findExportSessions = vi.fn().mockImplementation(() => Promise.resolve({ total: mockSessions.length, sessions: mockSessions }));
      findById = vi.fn().mockResolvedValue(null);
      upsertSession = vi.fn().mockResolvedValue(undefined);
    }
  };
});

vi.mock('../repositories/event.repository', () => {
  return {
    EventRepository: class {
      findExportEvents = vi.fn().mockImplementation(() => Promise.resolve({ total: mockEvents.length, events: mockEvents }));
    }
  };
});

const app = createApp();

describe('Enterprise Features API', () => {
  // Test authentication check across routes
  describe('Authentication Gates', () => {
    it('should return 401 when GET /api/users lacks authorization', async () => {
      const response = await request(app).get('/api/users');
      expect(response.status).toBe(401);
    });

    it('should return 401 when POST /api/users lacks authorization', async () => {
      const response = await request(app).post('/api/users').send({ email: 'test@example.com', name: 'Test' });
      expect(response.status).toBe(401);
    });

    it('should return 401 when GET /api/sessions/ses_1/annotations lacks authorization', async () => {
      const response = await request(app).get('/api/sessions/ses_1/annotations');
      expect(response.status).toBe(401);
    });

    it('should return 401 when GET /api/export/sessions lacks API key', async () => {
      const response = await request(app).get('/api/export/sessions');
      expect(response.status).toBe(401);
    });
  });

  // Team Management endpoints (/users)
  describe('Team Management (/api/users)', () => {
    it('should return users list when authorized', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', 'Bearer supersecret');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].email).toBe('alice@example.com');
    });

    it('should create a new user with valid data', async () => {
      const payload = {
        email: 'new_user@example.com',
        name: 'New User',
        role: 'member'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', 'Bearer supersecret')
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('new_user@example.com');
      expect(response.body.data.role).toBe('member');
    });

    it('should reject user creation when email already exists', async () => {
      const payload = {
        email: 'alice@example.com', // Already in mockUsers
        name: 'Alice',
        role: 'admin'
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', 'Bearer supersecret')
        .send(payload);

      expect(response.status).toBe(409); // Conflict
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('already exists');
    });

    it('should reject invalid role in schema validation', async () => {
      const payload = {
        email: 'new@example.com',
        name: 'New',
        role: 'superadmin' // Invalid role
      };

      const response = await request(app)
        .post('/api/users')
        .set('Authorization', 'Bearer supersecret')
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Validation failed');
    });

    it('should delete a user when exists', async () => {
      const response = await request(app)
        .delete('/api/users/u2')
        .set('Authorization', 'Bearer supersecret');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('deleted successfully');
    });

    it('should return 404 when deleting a non-existent user', async () => {
      const response = await request(app)
        .delete('/api/users/u_nonexistent')
        .set('Authorization', 'Bearer supersecret');

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('not found');
    });
  });

  // Collaboration / Notes endpoints
  describe('Collaboration & Notes (/api/sessions/:id/annotations)', () => {
    it('should return annotations for a session', async () => {
      const response = await request(app)
        .get('/api/sessions/ses_1/annotations')
        .set('Authorization', 'Bearer supersecret');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].note).toBe('Rage click here');
    });

    it('should create an annotation with valid data', async () => {
      const payload = {
        timestampMs: 5000,
        note: 'User paused here',
        author: 'Bob'
      };

      const response = await request(app)
        .post('/api/sessions/ses_1/annotations')
        .set('Authorization', 'Bearer supersecret')
        .send(payload);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.note).toBe('User paused here');
      expect(response.body.data.author).toBe('Bob');
      expect(response.body.data.timestampMs).toBe(5000);
    });

    it('should delete an annotation', async () => {
      const response = await request(app)
        .delete('/api/annotations/a1')
        .set('Authorization', 'Bearer supersecret');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('should return 404 when deleting a non-existent annotation', async () => {
      const response = await request(app)
        .delete('/api/annotations/a_nonexistent')
        .set('Authorization', 'Bearer supersecret');

      expect(response.status).toBe(404);
    });
  });

  // Power BI Integration endpoint
  describe('Power BI Integration (/api/integrations/powerbi)', () => {
    it('should return flat sessions JSON when authenticating via query key', async () => {
      const response = await request(app)
        .get('/api/integrations/powerbi')
        .query({ apiKey: 'supersecret', resource: 'sessions' });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].sessionId).toBe('ses_1');
      expect(response.body[0].eventCount).toBe(15);
    });

    it('should return flat events JSON when authenticating via x-api-key header', async () => {
      const response = await request(app)
        .get('/api/integrations/powerbi')
        .query({ resource: 'events' })
        .set('x-api-key', 'supersecret');

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].type).toBe('click');
      expect(response.body[0].selector).toBe('button#pay');
    });

    it('should deny access when apiKey is incorrect', async () => {
      const response = await request(app)
        .get('/api/integrations/powerbi')
        .query({ apiKey: 'wrongpassword' });

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });
  });

  // Data Export API endpoints
  describe('Data Export API (/api/export/)', () => {
    it('should export sessions as JSON by default', async () => {
      const response = await request(app)
        .get('/api/export/sessions')
        .query({ apiKey: 'supersecret' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].sessionId).toBe('ses_1');
    });

    it('should export sessions as CSV when format=csv is queried', async () => {
      const response = await request(app)
        .get('/api/export/sessions')
        .query({ apiKey: 'supersecret', format: 'csv' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment; filename=sessions_export.csv');
      expect(response.text).toContain('sessionId,visitorId,userAgent,firstSeen,lastSeen,eventCount,frustrationCount');
      expect(response.text).toContain('ses_1');
    });

    it('should export events as JSON by default', async () => {
      const response = await request(app)
        .get('/api/export/events')
        .query({ apiKey: 'supersecret' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].eventId).toBe('e1');
    });

    it('should export events as CSV when format=csv is queried', async () => {
      const response = await request(app)
        .get('/api/export/events')
        .query({ apiKey: 'supersecret', format: 'csv' });

      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment; filename=events_export.csv');
      expect(response.text).toContain('eventId,sessionId,visitorId,projectId,type,url,timestamp,userAgent,selector,text,isFrustrated,errorMessage,scrollY,maxDepth');
      expect(response.text).toContain('e1');
    });
  });
});
