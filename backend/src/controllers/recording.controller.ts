import { Request, Response, NextFunction } from 'express';
import { RecordingRepository } from '../repositories/recording.repository';

export class RecordingController {
  constructor(private readonly recordingRepo: RecordingRepository) {}

  /**
   * POST /api/sessions/:id/recording
   * Append events to session recording.
   */
  ingest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const events = req.body;

      if (!Array.isArray(events)) {
        res.status(400).json({ success: false, error: 'Events must be an array' });
        return;
      }

      if (id && events.length > 0) {
        await this.recordingRepo.appendEvents(id, events);
      }
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  };

  /**
   * GET /api/sessions/:id/recording
   * Retrieve session recording events.
   */
  get = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const recording = await this.recordingRepo.findBySessionId(id);
      res.json({ success: true, data: recording?.events ?? [] });
    } catch (err) {
      next(err);
    }
  };
}
