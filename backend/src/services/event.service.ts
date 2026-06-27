import { EventRepository } from '../repositories/event.repository';
import { SessionRepository } from '../repositories/session.repository';
import { NotFoundError } from '../middleware/app-error';
import type { IEvent } from '../models/event.model';
import type { HeatmapQuery } from '../schemas/event.schema';

export class EventService {
  constructor(
    private eventRepository: EventRepository,
    private sessionRepository: SessionRepository,
  ) {}

  async getSessionEvents(sessionId: string): Promise<IEvent[]> {
    const exists = await this.sessionRepository.sessionExists(sessionId);
    if (!exists) {
      throw new NotFoundError(`Session '${sessionId}'`);
    }
    return this.eventRepository.findEventsBySessionId(sessionId);
  }

  async getHeatmap(query: HeatmapQuery): Promise<unknown> {
    const { url, type, sessionId, convertedOnly, conversionPath, conversionEvent, includeBots } = query;
    if (type === 'attention') {
      return this.eventRepository.findAttentionByUrl(url, sessionId);
    } else {
      return this.eventRepository.findClicksByUrl(url, sessionId, {
        convertedOnly,
        conversionPath,
        conversionEvent,
        includeBots,
      });
    }
  }

  async getTrackedUrls(): Promise<string[]> {
    return this.eventRepository.findDistinctClickUrls();
  }
}
