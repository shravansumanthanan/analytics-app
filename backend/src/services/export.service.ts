import { SessionRepository } from '../repositories/session.repository';
import { EventRepository } from '../repositories/event.repository';
import { ISession } from '../models/session.model';
import { IEvent } from '../models/event.model';

export class ExportService {
  constructor(
    private sessionRepository: SessionRepository,
    private eventRepository: EventRepository
  ) {}

  async exportSessions(filters: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ total: number; sessions: ISession[] }> {
    return this.sessionRepository.findExportSessions(filters);
  }

  async exportEvents(filters: {
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<{ total: number; events: IEvent[] }> {
    return this.eventRepository.findExportEvents(filters);
  }
}
