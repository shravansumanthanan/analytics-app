import { Request, Response } from 'express';
import { FunnelModel } from '../models/funnel.model';
import { EventModel } from '../models/event.model';
import { findAllSessions } from '../utils/session-query';

export interface FunnelStepResult {
  url: string;
  sessions: number;
  conversionRate: number;
  dropoffRate: number;
}

export class FunnelController {
  async create(req: Request, res: Response) {
    try {
      const { name, steps } = req.body;
      if (!name || !steps || !Array.isArray(steps) || steps.length === 0) {
        return res.status(400).json({ success: false, error: 'Invalid funnel definition' });
      }

      const funnel = await FunnelModel.create({ name, steps });
      res.status(201).json({ success: true, data: funnel });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to create funnel' });
    }
  }

  async getAll(req: Request, res: Response) {
    try {
      const funnels = await FunnelModel.find().sort({ createdAt: -1 });
      res.json({ success: true, data: funnels });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to fetch funnels' });
    }
  }

  async analyze(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const funnel = await FunnelModel.findById(id);
      if (!funnel) {
        return res.status(404).json({ success: false, error: 'Funnel not found' });
      }

      const filters: any = {};
      if (req.query.startDate) filters.startDate = req.query.startDate as string;
      if (req.query.endDate) filters.endDate = req.query.endDate as string;
      if (req.query.device) filters.device = req.query.device as any;
      if (req.query.frustratedOnly === 'true') filters.frustratedOnly = true;

      // 1. Get filtered session IDs (if filters provided)
      let sessionIds: string[] | undefined;
      if (Object.keys(filters).length > 0) {
        const sessions = await findAllSessions(filters);
        sessionIds = sessions.map(s => s.id);
      }

      // 2. Aggregate events for these sessions (or all if no filters)
      const matchStage: any = {
        type: 'page_view',
        url: { $in: funnel.steps }
      };
      if (sessionIds) {
        matchStage.sessionId = { $in: sessionIds };
      }

      const sessionEvents = await EventModel.aggregate([
        { $match: matchStage },
        { $sort: { timestamp: 1 } },
        { $group: {
            _id: '$sessionId',
            events: { $push: '$url' }
        }}
      ]);

      // 3. Compute funnel progression
      const stepCounts = new Array(funnel.steps.length).fill(0);

      for (const session of sessionEvents) {
        const urls = session.events;
        let currentStepIndex = 0;

        for (const url of urls) {
          if (url === funnel.steps[currentStepIndex]) {
            stepCounts[currentStepIndex]++;
            currentStepIndex++;
            if (currentStepIndex === funnel.steps.length) {
              break; // Finished the funnel
            }
          }
        }
      }

      // 4. Format results
      const results: FunnelStepResult[] = [];
      for (let i = 0; i < funnel.steps.length; i++) {
        const count = stepCounts[i];
        const prevCount = i === 0 ? count : stepCounts[i - 1]; // To calculate drop-off relative to prev step
        
        let conversionRate = 100;
        let dropoffRate = 0;

        if (i > 0) {
          conversionRate = prevCount > 0 ? Math.round((count / prevCount) * 100) : 0;
          dropoffRate = 100 - conversionRate;
        } else if (i === 0 && count === 0) {
          conversionRate = 0;
        }

        results.push({
          url: funnel.steps[i],
          sessions: count,
          conversionRate,
          dropoffRate
        });
      }

      res.json({ success: true, data: { steps: results } });
    } catch (err) {
      res.status(500).json({ success: false, error: 'Failed to analyze funnel' });
    }
  }
}
