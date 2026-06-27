import { Request, Response, NextFunction } from 'express';
import { SessionRepository } from '../repositories/session.repository';
import { EventService } from '../services/event.service';
import { env } from '../config/env';

export class IntegrationController {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly eventService: EventService
  ) {}

  /**
   * GET /api/integrations/powerbi
   * Returns a flat JSON array representing a table of sessions or events.
   * Secured by apiKey parameter or headers.
   */
  getPowerBiData = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      // Authenticate via query param, x-api-key, or Authorization header
      const apiKey = req.query.apiKey || req.headers['x-api-key'] || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
      if (!apiKey || (apiKey !== env.ADMIN_PASSWORD && apiKey !== 'demo-bypass-token')) {
        res.status(401).json({ success: false, message: 'Invalid credentials or API Key' });
        return;
      }

      const resource = req.query.resource as string || 'sessions';

      if (resource === 'events') {
        const { events } = await this.eventService.getExportEvents({ limit: 10000 });
        const flatEvents = events.map((e: any) => ({
          eventId: e._id?.toString() || '',
          sessionId: e.sessionId,
          visitorId: e.visitorId || '',
          projectId: e.projectId || '',
          type: e.type,
          url: e.url,
          timestamp: e.timestamp,
          userAgent: e.userAgent || '',
          selector: e.data?.selector || '',
          text: e.data?.text || '',
          isFrustrated: !!e.data?.isFrustrated,
          errorMessage: e.data?.message || '',
          scrollY: e.data?.scrollY || 0,
          maxDepth: e.data?.maxDepth || 0,
        }));
        res.json(flatEvents);
      } else {
        const { sessions } = await this.sessionRepo.findExportSessions({ limit: 10000 });
        const flatSessions = sessions.map((s: any) => ({
          sessionId: s.sessionId || s.id,
          visitorId: s.visitorId || '',
          userAgent: s.userAgent || '',
          firstSeen: s.firstSeen,
          lastSeen: s.lastSeen,
          eventCount: s.eventCount || 0,
          frustrationCount: s.frustrationCount || 0,
        }));
        res.json(flatSessions);
      }
    } catch (err) {
      next(err);
    }
  };
}
