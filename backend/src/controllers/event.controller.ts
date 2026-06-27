import { Request, Response, NextFunction } from 'express';
import type { IngestEventsInput, HeatmapQuery } from '../schemas/event.schema';
import { writeBufferQueue } from '../services/write-buffer.queue';
import { EventService } from '../services/event.service';

export class EventController {
  constructor(private eventService: EventService) {}

  /**
   * POST /api/events
   * Accepts a batch of one or more events.
   */
  ingest = async (
    req: Request<unknown, unknown, IngestEventsInput>,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const ip = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '';
      writeBufferQueue.add(req.body, ip);
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
      const query = req.query as unknown as HeatmapQuery;
      const data = await this.eventService.getHeatmap(query);
      res.json({ success: true, url: query.url, type: query.type, data });
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
