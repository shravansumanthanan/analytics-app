import type { TrackedEvent, ClickPoint } from '../types/event.types';
import type { IEvent } from '../models/event.model';
import { EventRepository } from '../repositories/event.repository';
import { SessionRepository } from '../repositories/session.repository';
import { getSocketIO } from '../socket';

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
  constructor(
    private readonly eventRepo: EventRepository,
    private readonly sessionRepo: SessionRepository,
  ) {}

  /**
   * Ingest a batch of events.
   *
   * Both writes (events + session upserts) are fired concurrently.
   * They are logically independent: a failed session upsert is not a
   * reason to discard the events. If strict consistency were required,
   * we would use a MongoDB transaction here.
   */
  async ingest(events: TrackedEvent[]): Promise<void> {
    await Promise.all([
      this.eventRepo.bulkCreate(events),
      this.sessionRepo.bulkUpsert(events),
    ]);

    // Broadcast to connected clients that new events arrived
    try {
      const io = getSocketIO();
      io.emit('new-events', events);
    } catch (e) {
      // Socket.IO might not be initialized during tests
    }
  }

  /** Return the ordered event timeline for a session. */
  async getSessionEvents(sessionId: string): Promise<IEvent[]> {
    return this.eventRepo.findBySessionId(sessionId);
  }

  /** Return click coordinates for the heatmap view. */
  async getClickHeatmap(url: string): Promise<ClickPoint[]> {
    return this.eventRepo.findClicksByUrl(url);
  }

  /** Return all URLs that have recorded click events. */
  async getTrackedUrls(): Promise<string[]> {
    return this.eventRepo.findDistinctClickUrls();
  }
}
