import { Request, Response, NextFunction } from 'express';
import { NotFoundError } from '../middleware/app-error';
import type { IngestEventsInput, HeatmapQuery } from '../schemas/event.schema';
import { writeBufferQueue } from '../services/write-buffer.queue';
import { sessionExists } from '../utils/session-query';
import {
  findEventsBySessionId,
  findClicksByUrl,
  findAttentionByUrl,
  findDistinctClickUrls
} from '../utils/event-query';

export class EventController {
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
      if (!(await sessionExists(id))) {
        throw new NotFoundError(`Session '${id}'`);
      }
      const events = await findEventsBySessionId(id);
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
        const attentionData = await findAttentionByUrl(url, sessionId);
        res.json({ success: true, url, type, data: attentionData });
      } else {
        const points = await findClicksByUrl(url, sessionId, {
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
      const urls = await findDistinctClickUrls();
      res.json({ success: true, data: urls });
    } catch (err) {
      next(err);
    }
  };
}
