import { FunnelRepository } from '../repositories/funnel.repository';
import { SessionRepository, SessionFilters } from '../repositories/session.repository';
import { EventRepository } from '../repositories/event.repository';
import { NotFoundError } from '../middleware/app-error';
import { IFunnel } from '../models/funnel.model';

export interface FunnelStepResult {
  url: string;
  sessions: number;
  conversionRate: number;
  dropoffRate: number;
}

export class FunnelService {
  constructor(
    private funnelRepository: FunnelRepository,
    private sessionRepository: SessionRepository,
    private eventRepository: EventRepository
  ) {}

  async createFunnel(name: string, steps: string[]): Promise<IFunnel> {
    return this.funnelRepository.create(name, steps);
  }

  async getFunnels(): Promise<IFunnel[]> {
    return this.funnelRepository.findAll();
  }

  async analyzeFunnel(id: string, filters: SessionFilters): Promise<{ steps: FunnelStepResult[] }> {
    const funnel = await this.funnelRepository.findById(id);
    if (!funnel) {
      throw new NotFoundError(`Funnel not found`);
    }

    // 1. Get filtered session IDs (if filters provided)
    let sessionIds: string[] | undefined;
    const hasFilters = Object.keys(filters).length > 0 && 
      (filters.startDate || filters.endDate || (filters.device && filters.device !== 'all') || filters.frustratedOnly);
    
    if (hasFilters) {
      const sessions = await this.sessionRepository.findAllSessions(filters);
      sessionIds = sessions.map(s => s.id);
    }

    // 2. Aggregate events for these sessions (or all if no filters)
    const matchStage: Record<string, unknown> = {
      type: 'page_view',
      url: { $in: funnel.steps }
    };
    if (sessionIds) {
      matchStage.sessionId = { $in: sessionIds };
    }

    const sessionEvents = await this.eventRepository.aggregateSessionEvents(matchStage);

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

  async deleteFunnel(id: string): Promise<any> {
    return this.funnelRepository.delete(id);
  }
}
