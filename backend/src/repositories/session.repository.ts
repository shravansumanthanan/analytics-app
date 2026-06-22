import type { TrackedEvent, SessionSummary } from '../types/event.types';
import { SessionModel, ISession } from '../models/session.model';

/**
 * SessionRepository — data-access layer for sessions.
 *
 * Sessions are never explicitly created by the client. Instead, they are
 * upserted (created-or-updated) whenever events arrive, keeping session
 * metadata in sync without a separate creation flow.
 */
export class SessionRepository {
  /**
   * Upsert session documents for each unique sessionId in the event batch.
   *
   * For each session:
   *   - Set firstSeen only on insert (setOnInsert).
   *   - Always update lastSeen and increment eventCount.
   *
   * bulkWrite sends all operations in a single round-trip to MongoDB.
   */
  async bulkUpsert(events: TrackedEvent[]): Promise<void> {
    // Group events by sessionId so we can compute per-session counts.
    const sessionMap = new Map<string, { timestamp: Date; count: number }>();

    for (const event of events) {
      const existing = sessionMap.get(event.sessionId);
      if (!existing || event.timestamp > existing.timestamp) {
        sessionMap.set(event.sessionId, {
          timestamp: event.timestamp,
          count: (existing?.count ?? 0) + 1,
        });
      } else {
        existing.count += 1;
      }
    }

    const ops = Array.from(sessionMap.entries()).map(([sessionId, { timestamp, count }]) => ({
      updateOne: {
        filter: { sessionId },
        update: {
          $setOnInsert: { firstSeen: timestamp },
          $set: { lastSeen: timestamp },
          $inc: { eventCount: count },
        },
        upsert: true,
      },
    }));

    if (ops.length > 0) {
      await SessionModel.bulkWrite(ops, { ordered: false });
    }
  }

  /** List all sessions, most-recently-active first. */
  async findAll(): Promise<SessionSummary[]> {
    return SessionModel.find()
      .sort({ lastSeen: -1 })
      .lean<ISession[]>()
      .exec()
      .then((docs) =>
        docs.map((doc) => ({
          sessionId: doc.sessionId,
          firstSeen: doc.firstSeen,
          lastSeen: doc.lastSeen,
          eventCount: doc.eventCount,
        })),
      );
  }

  /** Check whether a session exists — used by the session detail endpoint. */
  async exists(sessionId: string): Promise<boolean> {
    const count = await SessionModel.countDocuments({ sessionId }).exec();
    return count > 0;
  }
}
