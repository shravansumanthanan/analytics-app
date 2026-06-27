import { SessionModel, ISession } from '../models/session.model';
import { EventModel } from '../models/event.model';
import { isBotUserAgent } from '../utils/bot-detector';
import type { TrackedEvent, SessionSummary } from '../types/event.types';

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
  /** Check if a session exists */
  async sessionExists(sessionId: string): Promise<boolean> {
    const count = await SessionModel.countDocuments({ sessionId }).exec();
    return count > 0;
  }

  /** Find session by ID */
  async findById(sessionId: string): Promise<ISession | null> {
    return SessionModel.findOne({ sessionId }).exec();
  }

  /** Bulk upsert sessions from event batch */
  async bulkUpsertSessions(events: TrackedEvent[]): Promise<void> {
    const sessionMap = new Map<string, {
      earliestTimestamp: Date;
      latestTimestamp: Date;
      count: number;
      frustrationCount: number;
      pageViewsCount: number;
      visitorId: string;
      userAgent: string;
      isBot: boolean;
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      deviceType?: string;
      country?: string;
      region?: string;
      city?: string;
    }>();

    for (const event of events) {
      const ev = event as any;
      const isFrustrated = event.type === 'click' && event.data && (event.data as any).isFrustrated ? 1 : 0;
      const eventIsBot = isBotUserAgent(event.userAgent);
      const isPV = event.type === 'page_view' ? 1 : 0;

      const existing = sessionMap.get(event.sessionId);
      const timestamp = new Date(event.timestamp);

      if (!existing) {
        sessionMap.set(event.sessionId, {
          earliestTimestamp: timestamp,
          latestTimestamp: timestamp,
          count: 1,
          frustrationCount: isFrustrated,
          pageViewsCount: isPV,
          visitorId: event.visitorId || 'unknown',
          userAgent: event.userAgent || 'unknown',
          isBot: eventIsBot,
          utmSource: ev.utmSource,
          utmMedium: ev.utmMedium,
          utmCampaign: ev.utmCampaign,
          deviceType: ev.deviceType,
          country: ev.country,
          region: ev.region,
          city: ev.city,
        });
      } else {
        existing.count += 1;
        existing.frustrationCount += isFrustrated;
        existing.pageViewsCount += isPV;
        if (timestamp < existing.earliestTimestamp) {
          existing.earliestTimestamp = timestamp;
        }
        if (timestamp > existing.latestTimestamp) {
          existing.latestTimestamp = timestamp;
        }
        if (eventIsBot) {
          existing.isBot = true;
        }
        if (ev.utmSource) existing.utmSource = ev.utmSource;
        if (ev.utmMedium) existing.utmMedium = ev.utmMedium;
        if (ev.utmCampaign) existing.utmCampaign = ev.utmCampaign;
        if (ev.deviceType) existing.deviceType = ev.deviceType;
        if (ev.country) existing.country = ev.country;
        if (ev.region) existing.region = ev.region;
        if (ev.city) existing.city = ev.city;
      }
    }

    const sessionIds = Array.from(sessionMap.keys());
    const existingSessions = await SessionModel.find({ sessionId: { $in: sessionIds } }).lean().exec();
    const existingSessionsMap = new Map<string, any>();
    for (const s of existingSessions) {
      existingSessionsMap.set(s.sessionId, s);
    }

    const ops = Array.from(sessionMap.entries()).map(([sessionId, update]) => {
      const dbSession = existingSessionsMap.get(sessionId);
      
      const firstSeen = dbSession ? new Date(dbSession.firstSeen) : update.earliestTimestamp;
      const lastSeen = dbSession 
        ? (new Date(dbSession.lastSeen) > update.latestTimestamp ? new Date(dbSession.lastSeen) : update.latestTimestamp)
        : update.latestTimestamp;
        
      const eventCount = (dbSession?.eventCount || 0) + update.count;
      const frustrationCount = (dbSession?.frustrationCount || 0) + update.frustrationCount;
      const pageViewsCount = (dbSession?.pageViewsCount || 0) + update.pageViewsCount;
      
      const durationMs = lastSeen.getTime() - firstSeen.getTime();
      const sessionDuration = Math.max(0, Math.round(durationMs / 1000));
      const bounce = eventCount <= 1 || sessionDuration < 10;

      return {
        updateOne: {
          filter: { sessionId },
          update: {
            $setOnInsert: { 
              firstSeen, 
              visitorId: update.visitorId, 
              userAgent: update.userAgent,
              deviceType: update.deviceType,
              country: update.country,
              region: update.region,
              city: update.city,
              utmSource: update.utmSource,
              utmMedium: update.utmMedium,
              utmCampaign: update.utmCampaign,
            },
            $set: { 
              lastSeen, 
              isBot: dbSession ? (dbSession.isBot || update.isBot) : update.isBot,
              sessionDuration,
              bounce,
              eventCount,
              frustrationCount,
              pageViewsCount,
            },
          },
          upsert: true,
        },
      };
    });

    if (ops.length > 0) {
      await SessionModel.bulkWrite(ops, { ordered: false });
    }
  }

  /** Find all sessions by filters */
  async findAllSessions(filters: SessionFilters = {}): Promise<SessionSummary[]> {
    const query: any = {};
    if (filters.includeBots !== true) {
      query.isBot = { $ne: true };
    }
    
    const eventQuery: any = {};
    let hasEventFilters = false;

    if (filters.includeBots !== true) {
      eventQuery.isBot = { $ne: true };
    }

    const escapeRegExp = (str: string): string => {
      return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    if (filters.visitedPath) {
      eventQuery.type = 'page_view';
      eventQuery.url = { $regex: new RegExp(escapeRegExp(filters.visitedPath), 'i') };
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
      query.deviceType = filters.device;
    }

    const docs = await SessionModel.find(query)
      .sort({ lastSeen: -1 })
      .lean<ISession[]>()
      .exec();

    return docs.map((doc) => ({
      id: doc.sessionId,
      visitorId: doc.visitorId || 'unknown',
      userAgent: doc.userAgent || 'unknown',
      startedAt: doc.firstSeen,
      lastActiveAt: doc.lastSeen,
      eventCount: doc.eventCount,
      frustrationCount: doc.frustrationCount || 0,
      sessionDuration: doc.sessionDuration,
      bounce: doc.bounce,
      pageViewsCount: doc.pageViewsCount,
      deviceType: doc.deviceType,
      country: doc.country,
      region: doc.region,
      city: doc.city,
      utmSource: doc.utmSource,
      utmMedium: doc.utmMedium,
      utmCampaign: doc.utmCampaign,
    }));
  }

  /** Paginated session export */
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

  /** Delete all session documents */
  async clear(): Promise<void> {
    await SessionModel.deleteMany({}).exec();
  }

  /** Bulk insert raw sessions */
  async insertMany(sessions: unknown[]): Promise<void> {
    await SessionModel.insertMany(sessions);
  }
}
