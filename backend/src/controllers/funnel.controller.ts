import { Request, Response } from 'express';
import { FunnelService } from '../services/funnel.service';
import { SessionFilters } from '../repositories/session.repository';

const funnelService = new FunnelService();

export class FunnelController {
  async create(req: Request, res: Response) {
    try {
      const { name, steps } = req.body;
      if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
        return res.status(400).json({ success: false, error: 'Invalid funnel definition' });
      }

      const funnel = await funnelService.createFunnel(name, steps);
      res.status(201).json({ success: true, data: funnel });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to create funnel' });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const funnels = await funnelService.getFunnels();
      res.json({ success: true, data: funnels });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch funnels' });
    }
  }

  async analyze(req: Request, res: Response) {
    try {
      const { id } = req.params;
      
      const filters: SessionFilters = {};
      if (req.query.startDate) filters.startDate = req.query.startDate as string;
      if (req.query.endDate) filters.endDate = req.query.endDate as string;
      if (req.query.device) filters.device = req.query.device as any;
      if (req.query.frustratedOnly === 'true') filters.frustratedOnly = true;

      const analysis = await funnelService.analyzeFunnel(id, filters);
      res.json({ success: true, data: analysis });
    } catch (err: any) {
      if (err.message === 'Funnel not found') {
        return res.status(404).json({ success: false, error: 'Funnel not found' });
      }
      res.status(500).json({ success: false, error: 'Failed to analyze funnel' });
    }
  }
}
