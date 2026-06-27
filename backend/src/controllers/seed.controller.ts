import { Request, Response, NextFunction } from 'express';
import { SeedService } from '../services/seed.service';

export class SeedController {
  constructor(private seedService: SeedService) {}

  clear = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.seedService.clearDemoData();
      res.json({ success: true, message: 'Database cleared successfully.' });
    } catch (err) {
      next(err);
    }
  };

  seed = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const counts = await this.seedService.seedDemoData();
      res.status(201).json({
        success: true,
        message: 'Demo data seeded.',
        counts: {
          sessions: counts.sessionsCount,
          events: counts.eventsCount,
          recordings: counts.recordingsCount,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}
