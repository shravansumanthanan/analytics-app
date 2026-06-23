import type { TrackedEvent, ClickPoint } from '../types/event.types';
import type { IEvent } from '../models/event.model';
import { EventRepository } from '../repositories/event.repository';
import { SessionRepository } from '../repositories/session.repository';
import { WriteBufferQueue } from './write-buffer.queue';

/**
 * EventService — business logic for event ingestion and querying.
 *
 * Receives domain objects from controllers, coordinates repositories,
 * and enforces business rules. It has no knowledge of HTTP (Request/Response).
 *
 * Dependencies are injected via the constructor, making this class
 * independently testable without a running database.
 */
export class EventService {
  private readonly writeBuffer: WriteBufferQueue;

  constructor(
    private readonly eventRepo: EventRepository,
    private readonly sessionRepo: SessionRepository,
  ) {
    this.writeBuffer = new WriteBufferQueue(eventRepo, sessionRepo);
  }

  /**
   * Ingest a batch of events asynchronously using the write buffer queue.
   */
  async ingest(events: TrackedEvent[], ip?: string): Promise<void> {
    this.writeBuffer.add(events, ip);
  }

  /** Return the ordered event timeline for a session. */
  async getSessionEvents(sessionId: string): Promise<IEvent[]> {
    return this.eventRepo.findBySessionId(sessionId);
  }

  /** Return click coordinates for the heatmap view. */
  async getClickHeatmap(
    url: string, 
    sessionId?: string, 
    filters?: { convertedOnly?: boolean; conversionPath?: string; conversionEvent?: string; includeBots?: boolean }
  ): Promise<ClickPoint[]> {
    return this.eventRepo.findClicksByUrl(url, sessionId, filters);
  }

  /** Return scroll attention data for the heatmap view. */
  async getAttentionHeatmap(url: string, sessionId?: string): Promise<Record<string, number>> {
    return this.eventRepo.findAttentionByUrl(url, sessionId);
  }

  /** Return all URLs that have recorded click events. */
  async getTrackedUrls(): Promise<string[]> {
    return this.eventRepo.findDistinctClickUrls();
  }

  async getExportEvents(filters: { startDate?: string; endDate?: string; page?: number; limit?: number }): Promise<{ total: number; events: IEvent[] }> {
    return this.eventRepo.findExportEvents(filters);
  }
}
