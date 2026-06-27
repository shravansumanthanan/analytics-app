import { Request, Response, NextFunction } from 'express';
import { FunnelService } from '../services/funnel.service';
import { ValidationError, NotFoundError } from '../middleware/app-error';

export class FunnelController {
  constructor(private funnelService: FunnelService) {}

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, steps } = req.body;
      if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
        throw new ValidationError('Invalid funnel definition');
      }

      const funnel = await this.funnelService.createFunnel(name, steps);
      res.status(201).json({ success: true, data: funnel });
    } catch (err) {
      next(err);
    }
  };

  getAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const funnels = await this.funnelService.getFunnels();
      res.json({ success: true, data: funnels });
    } catch (err) {
      next(err);
    }
  };

  analyze = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const filters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        device: req.query.device as any,
        frustratedOnly: req.query.frustratedOnly === 'true',
      };

      const result = await this.funnelService.analyzeFunnel(id, filters);
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.funnelService.deleteFunnel(id);
      if (!deleted) {
        throw new NotFoundError(`Funnel with ID '${id}' not found`);
      }
      res.json({ success: true, message: 'Funnel deleted successfully', data: deleted });
    } catch (err) {
      next(err);
    }
  };
}
