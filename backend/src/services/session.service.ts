import type { SessionSummary } from '../types/event.types';
import { SessionRepository } from '../repositories/session.repository';
import { NotFoundError } from '../middleware/app-error';

/**
 * SessionService — business logic for session queries.
 */
export class SessionService {
  constructor(private readonly sessionRepo: SessionRepository) {}

  async getAllSessions(filters: any = {}): Promise<SessionSummary[]> {
    return this.sessionRepo.findAll(filters);
  }

  /**
   * Verify the session exists before the event controller queries it.
   * Throwing NotFoundError here keeps the controller free of guard logic.
   */
  async assertSessionExists(sessionId: string): Promise<void> {
    const exists = await this.sessionRepo.exists(sessionId);
    if (!exists) {
      throw new NotFoundError(`Session '${sessionId}'`);
    }
  }

  async getExportSessions(filters: { startDate?: string; endDate?: string; page?: number; limit?: number }) {
    return this.sessionRepo.findExportSessions(filters);
  }
}
