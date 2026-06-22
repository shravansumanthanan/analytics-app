import { Request, Response, NextFunction } from 'express';
import { SessionService } from '../services/session.service';

/**
 * SessionController — handles session listing endpoint.
 */
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  /**
   * GET /api/sessions
   * Returns all sessions ordered by most-recently-active.
   */
  getAll = async (
    _req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const sessions = await this.sessionService.getAllSessions();
      res.json({ success: true, data: sessions });
    } catch (err) {
      next(err);
    }
  };
}
