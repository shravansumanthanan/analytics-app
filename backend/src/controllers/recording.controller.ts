import { Request, Response, NextFunction } from 'express';
import { RecordingModel } from '../models/recording.model';

export class RecordingController {
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
        await RecordingModel.findOneAndUpdate(
          { sessionId: id },
          {
            $push: { events: { $each: events } },
            $setOnInsert: { createdAt: new Date() }
          },
          { upsert: true, new: true }
        ).exec();
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
      const recording = await RecordingModel.findOne({ sessionId: id }).exec();
      res.json({ success: true, data: recording?.events ?? [] });
    } catch (err) {
      next(err);
    }
  };
}
