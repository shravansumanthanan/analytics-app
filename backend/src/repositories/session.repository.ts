import type { TrackedEvent, SessionSummary } from '../types/event.types';
import { SessionModel, ISession } from '../models/session.model';
import { EventModel } from '../models/event.model';
import { isBotUserAgent } from '../utils/bot-detector';

/**
 * SessionRepository — data-access layer for sessions.
 *
 * Sessions are never explicitly created by the client. Instead, they are
 * upserted (created-or-updated) whenever events arrive, keeping session
 * metadata in sync without a separate creation flow.
 */
export interface SessionFilters {
  startDate?: string;
  endDate?: string;
  device?: 'mobile' | 'desktop' | 'all';
  frustratedOnly?: boolean;
  visitedPath?: string;
  clickedSelector?: string;
  hasError?: boolean;
  customEvent?: string;
  includeBots?: boolean;
}

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
    const sessionMap = new Map<string, { timestamp: Date; count: number; frustrationCount: number; visitorId: string; userAgent: string; isBot: boolean }>();

    for (const event of events) {
      const isFrustrated = event.type === 'click' && event.data && (event.data as any).isFrustrated ? 1 : 0;
      const eventIsBot = isBotUserAgent(event.userAgent);
      
      const existing = sessionMap.get(event.sessionId);
      if (!existing || event.timestamp > existing.timestamp) {
        sessionMap.set(event.sessionId, {
          timestamp: event.timestamp,
          count: (existing?.count ?? 0) + 1,
          frustrationCount: (existing?.frustrationCount ?? 0) + isFrustrated,
          visitorId: event.visitorId || 'unknown',
          userAgent: event.userAgent || 'unknown',
          isBot: existing ? (existing.isBot || eventIsBot) : eventIsBot,
        });
      } else {
        existing.count += 1;
        existing.frustrationCount += isFrustrated;
        if (eventIsBot) {
          existing.isBot = true;
        }
      }
    }

    const ops = Array.from(sessionMap.entries()).map(([sessionId, { timestamp, count, frustrationCount, visitorId, userAgent, isBot }]) => ({
      updateOne: {
        filter: { sessionId },
        update: {
          $setOnInsert: { firstSeen: timestamp, visitorId, userAgent, isBot },
          $set: { lastSeen: timestamp, isBot },
          $inc: { eventCount: count, frustrationCount: frustrationCount },
        },
        upsert: true,
      },
    }));

    if (ops.length > 0) {
      await SessionModel.bulkWrite(ops, { ordered: false });
    }
  }

  /** List all sessions, most-recently-active first. */
  async findAll(filters: SessionFilters = {}): Promise<SessionSummary[]> {
    const query: any = {};
    if (filters.includeBots !== true) {
      query.isBot = { $ne: true };
    }
    
    // Resolve event-level filters
    const eventQuery: any = {};
    let hasEventFilters = false;

    if (filters.includeBots !== true) {
      eventQuery.isBot = { $ne: true };
    }

    if (filters.visitedPath) {
      eventQuery.type = 'page_view';
      eventQuery.url = { $regex: new RegExp(filters.visitedPath, 'i') };
      hasEventFilters = true;
    }
    if (filters.clickedSelector) {
      eventQuery.type = 'click';
      eventQuery['data.selector'] = filters.clickedSelector;
      hasEventFilters = true;
    }
    if (filters.hasError) {
      eventQuery.type = 'js_error';
      hasEventFilters = true;
    }
    if (filters.customEvent) {
      eventQuery.type = 'custom';
      eventQuery['data.name'] = filters.customEvent;
      hasEventFilters = true;
    }

    if (hasEventFilters) {
      const matchingEvents = await EventModel.find(eventQuery).select('sessionId').lean().exec();
      const sessionIds = matchingEvents.map(e => e.sessionId);
      query.sessionId = { $in: sessionIds };
    }

    if (filters.startDate || filters.endDate) {
      query.lastSeen = {};
      if (filters.startDate) query.lastSeen.$gte = new Date(filters.startDate);
      if (filters.endDate) query.lastSeen.$lte = new Date(filters.endDate);
    }
    
    if (filters.frustratedOnly) {
      query.frustrationCount = { $gt: 0 };
    }
    
    if (filters.device && filters.device !== 'all') {
      if (filters.device === 'mobile') {
        query.userAgent = { $regex: /Mobi|Android/i };
      } else if (filters.device === 'desktop') {
        query.userAgent = { $not: { $regex: /Mobi|Android/i } };
      }
    }

    return SessionModel.find(query)
      .sort({ lastSeen: -1 })
      .lean<ISession[]>()
      .exec()
      .then((docs) =>
        docs.map((doc) => ({
          id: doc.sessionId,
          visitorId: doc.visitorId || 'unknown',
          userAgent: doc.userAgent || 'unknown',
          startedAt: doc.firstSeen,
          lastActiveAt: doc.lastSeen,
          eventCount: doc.eventCount,
          frustrationCount: doc.frustrationCount || 0,
        })),
      );
  }

  /** Check whether a session exists — used by the session detail endpoint. */
  async exists(sessionId: string): Promise<boolean> {
    const count = await SessionModel.countDocuments({ sessionId }).exec();
    return count > 0;
  }

  /** Fetch a paginated list of sessions for data export or integration queries. */
  async findExportSessions(filters: { startDate?: string; endDate?: string; page?: number; limit?: number }): Promise<{ total: number; sessions: ISession[] }> {
    const query: any = {};
    if (filters.startDate || filters.endDate) {
      query.lastSeen = {};
      if (filters.startDate) query.lastSeen.$gte = new Date(filters.startDate);
      if (filters.endDate) query.lastSeen.$lte = new Date(filters.endDate);
    }
    const page = filters.page || 1;
    const limit = filters.limit || 100;
    const skip = (page - 1) * limit;

    const total = await SessionModel.countDocuments(query).exec();
    const sessions = await SessionModel.find(query)
      .sort({ lastSeen: -1 })
      .skip(skip)
      .limit(limit)
      .lean<ISession[]>()
      .exec();

    return { total, sessions };
  }
}
