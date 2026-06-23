import { FunnelRepository } from '../repositories/funnel.repository';
import { EventModel } from '../models/event.model';
import { SessionFilters, SessionRepository } from '../repositories/session.repository';

export interface FunnelStepResult {
  url: string;
  sessions: number;
  conversionRate: number;
  dropoffRate: number;
}

export class FunnelService {
  private funnelRepo: FunnelRepository;
  private sessionRepo: SessionRepository;

  constructor() {
    this.funnelRepo = new FunnelRepository();
    this.sessionRepo = new SessionRepository();
  }

  async createFunnel(name: string, steps: string[]) {
    return this.funnelRepo.create(name, steps);
  }

  async getFunnels() {
    return this.funnelRepo.findAll();
  }

  async analyzeFunnel(id: string, filters?: SessionFilters): Promise<{ steps: FunnelStepResult[] }> {
    const funnel = await this.funnelRepo.findById(id);
    if (!funnel) {
      throw new Error('Funnel not found');
    }

    // 1. Get filtered session IDs (if filters provided)
    let sessionIds: string[] | undefined;
    if (filters && Object.keys(filters).length > 0) {
      const sessions = await this.sessionRepo.findAll(filters);
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

    return { steps: results };
  }
}
