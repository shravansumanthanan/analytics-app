import { Request, Response, NextFunction } from 'express';
import { RecordingService } from '../services/recording.service';
import { ValidationError } from '../middleware/app-error';

export class RecordingController {
  constructor(private recordingService: RecordingService) {}

  /**
   * POST /api/sessions/:id/recording
   * Append events to session recording.
   */
  ingest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const events = req.body;

      if (!Array.isArray(events)) {
        throw new ValidationError('Events must be an array');
      }

      if (id && events.length > 0) {
        await this.recordingService.appendEvents(id, events);
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
      const events = await this.recordingService.getRecordingEvents(id);
      res.json({ success: true, data: events });
    } catch (err) {
      next(err);
    }
  };
}
