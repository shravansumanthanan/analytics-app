import { Request, Response, NextFunction } from 'express';
import { findAllSessions } from '../utils/session-query';

/**
 * SessionController — handles session listing endpoint.
 */
export class SessionController {
  /**
   * GET /api/sessions
   * Returns all sessions ordered by most-recently-active.
   */
  getAll = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const filters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        device: req.query.device as 'mobile' | 'desktop' | 'all',
        frustratedOnly: req.query.frustratedOnly === 'true',
        visitedPath: req.query.visitedPath as string,
        clickedSelector: req.query.clickedSelector as string,
        hasError: req.query.hasError === 'true',
        customEvent: req.query.customEvent as string,
        includeBots: req.query.includeBots === 'true',
      };
      const sessions = await findAllSessions(filters);
      res.json({ success: true, data: sessions });
    } catch (err) {
      next(err);
    }
  };
}
