import { Request, Response, NextFunction } from 'express';
import { RecordingService } from '../services/recording.service';

export class RecordingController {
  private recordingService: RecordingService;

  constructor() {
    this.recordingService = new RecordingService();
  }

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

      await this.recordingService.addEvents(id, events);
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
      const events = await this.recordingService.getRecording(id);
      res.json({ success: true, data: events });
    } catch (err) {
      next(err);
    }
  };
}
