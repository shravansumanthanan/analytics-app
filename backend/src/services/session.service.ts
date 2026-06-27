import { SessionRepository, SessionFilters } from '../repositories/session.repository';
import type { SessionSummary } from '../types/event.types';

export class SessionService {
  constructor(private sessionRepository: SessionRepository) {}

  async sessionExists(sessionId: string): Promise<boolean> {
    return this.sessionRepository.sessionExists(sessionId);
  }

  async getSessions(filters: SessionFilters = {}): Promise<SessionSummary[]> {
    return this.sessionRepository.findAllSessions(filters);
  }
}
