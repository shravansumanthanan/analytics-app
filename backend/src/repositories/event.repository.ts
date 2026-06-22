import type { TrackedEvent, ClickPoint } from '../types/event.types';
import { EventModel, IEvent } from '../models/event.model';

/**
 * EventRepository — data-access layer for events.
 *
 * Responsibilities:
 *   - Translate between domain types (TrackedEvent) and persistence types (IEvent).
 *   - Execute queries; return plain objects (not Mongoose documents) to the service layer.
 *   - No business logic here — it goes in the service.
 */
export class EventRepository {
  /**
   * Persist a batch of events in a single bulk write.
   * insertMany is significantly faster than individual inserts for high-volume ingestion.
   */
  async bulkCreate(events: TrackedEvent[]): Promise<void> {
    await EventModel.insertMany(events, { ordered: false });
  }

  /**
   * Fetch all events for a session, ordered chronologically.
   * Lean() returns plain JS objects instead of full Mongoose documents —
   * faster and sufficient since the service doesn't need document methods.
   */
  async findBySessionId(sessionId: string): Promise<IEvent[]> {
    return EventModel.find({ sessionId })
      .sort({ timestamp: 1 })
      .lean<IEvent[]>()
      .exec();
  }

  /**
   * Fetch click coordinates for a given page URL.
   * Projects only the fields needed by the heatmap — avoids over-fetching.
   */
  async findClicksByUrl(url: string): Promise<ClickPoint[]> {
    return EventModel.find({ url, type: 'click' })
      .select({ x: 1, y: 1, _id: 0 })
      .lean<ClickPoint[]>()
      .exec();
  }

  /**
   * Return all distinct URLs that have at least one click event.
   * Powers the URL selector dropdown in the heatmap view.
   */
  async findDistinctClickUrls(): Promise<string[]> {
    return EventModel.distinct('url', { type: 'click' }).exec();
  }
}
