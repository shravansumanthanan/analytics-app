import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { createApp } from '../app';

// Mock Mongoose models directly
vi.mock('../models/user.model', () => {
  const users = [
    { _id: 'u1', name: 'Alice Smith', email: 'alice@example.com', role: 'admin', createdAt: new Date().toISOString() },
    { _id: 'u2', name: 'Bob Jones', email: 'bob@example.com', role: 'member', createdAt: new Date().toISOString() }
  ];
  return {
    UserModel: {
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(users)
          })
        })
      }),
      findOne: vi.fn().mockImplementation(({ email }) => ({
        exec: vi.fn().mockResolvedValue(users.find(u => u.email === email) || null)
      })),
      create: vi.fn().mockImplementation((userData: any) => Promise.resolve({ _id: 'u_new', ...userData, createdAt: new Date().toISOString() })),
      findByIdAndDelete: vi.fn().mockImplementation((id: string) => ({
        exec: vi.fn().mockResolvedValue(id === 'u_nonexistent' ? null : { _id: id })
      }))
    }
  };
});

vi.mock('../models/annotation.model', () => {
  const annotations = [
    { _id: 'a1', sessionId: 'ses_1', timestampMs: 1200, note: 'Rage click here', author: 'Alice', createdAt: new Date().toISOString() }
  ];
  return {
    AnnotationModel: {
      find: vi.fn().mockReturnValue({
        sort: vi.fn().mockReturnValue({
          lean: vi.fn().mockReturnValue({
            exec: vi.fn().mockResolvedValue(annotations)
          })
        })
      }),
      create: vi.fn().mockImplementation((data: any) => Promise.resolve({ _id: 'a_new', ...data, createdAt: new Date().toISOString() })),
      findByIdAndDelete: vi.fn().mockImplementation((id: string) => ({
        exec: vi.fn().mockResolvedValue(id === 'a_nonexistent' ? null : { _id: id })
      }))
    }
  };
});

vi.mock('../repositories/session.repository', () => {
  const sessions = [
    { id: 'ses_1', sessionId: 'ses_1', visitorId: 'vis_1', userAgent: 'Chrome', firstSeen: new Date().toISOString(), lastSeen: new Date().toISOString(), eventCount: 15, frustrationCount: 2 }
  ];
  return {
    SessionRepository: class {
      findExportSessions = vi.fn().mockImplementation(() => Promise.resolve({ total: sessions.length, sessions: sessions }));
      sessionExists = vi.fn().mockResolvedValue(true);
    }
  };
});

vi.mock('../repositories/event.repository', () => {
  const events = [
    { _id: 'e1', sessionId: 'ses_1', visitorId: 'vis_1', projectId: 'proj_1', type: 'click', url: 'http://example.com', timestamp: new Date().toISOString(), userAgent: 'Chrome', data: { selector: 'button#pay', text: 'Pay Now', isFrustrated: false } }
  ];
  return {
    EventRepository: class {
      findExportEvents = vi.fn().mockImplementation(() => Promise.resolve({ total: events.length, events: events }));
      findEventsBySessionId = vi.fn().mockResolvedValue([]);
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
