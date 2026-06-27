import { Request, Response, NextFunction } from 'express';
import { EventService } from '../services/event.service';
import { SessionRepository } from '../repositories/session.repository';
import { NotFoundError } from '../middleware/app-error';
import type { IngestEventsInput, HeatmapQuery } from '../schemas/event.schema';

/**
 * EventController — handles HTTP request/response concerns only.
 *
 * Controllers do not contain business logic. They:
 *   1. Extract validated data from the request (already parsed by middleware).
 *   2. Delegate to the service layer.
 *   3. Shape the HTTP response.
 *
 * All errors are forwarded to the global error middleware via next(err).
 */
export class EventController {
  constructor(
    private readonly eventService: EventService,
    private readonly sessionRepo: SessionRepository,
  ) {}

  /**
   * POST /api/events
   * Accepts a batch of one or more events.
   * Body is already validated and typed by the validate middleware.
   */
  ingest = async (
    req: Request<unknown, unknown, IngestEventsInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
      await this.eventService.ingest(req.body, ip);
      res.status(202).json({ success: true, accepted: req.body.length });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/sessions/:id/events
   * Returns the ordered event timeline for a session.
   */
  getSessionEvents = async (
    req: Request<{ id: string }>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { id } = req.params;
      if (!(await this.sessionRepo.exists(id))) {
        throw new NotFoundError(`Session '${id}'`);
      }
      const events = await this.eventService.getSessionEvents(id);
      res.json({ success: true, data: events });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/heatmap?url=<encoded-url>
   * Returns click coordinates for the heatmap visualisation.
   */
  getHeatmap = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const { url, type, sessionId, convertedOnly, conversionPath, conversionEvent, includeBots } = req.query as any as HeatmapQuery;
      if (type === 'attention') {
        const attentionData = await this.eventService.getAttentionHeatmap(url, sessionId);
        res.json({ success: true, url, type, data: attentionData });
      } else {
        const points = await this.eventService.getClickHeatmap(url, sessionId, {
          convertedOnly,
          conversionPath,
          conversionEvent,
          includeBots,
        });
        res.json({ success: true, url, type, data: points });
      }
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/heatmap/urls
   * Returns all URLs that have recorded click events.
   */
  getTrackedUrls = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const urls = await this.eventService.getTrackedUrls();
      res.json({ success: true, data: urls });
    } catch (err) {
      next(err);
    }
  };
}
