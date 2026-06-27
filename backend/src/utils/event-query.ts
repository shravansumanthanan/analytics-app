import { EventModel, IEvent } from '../models/event.model';
import { isBotUserAgent } from './bot-detector';
import type { TrackedEvent, ClickPoint } from '../types/event.types';

/** Bulk insert a batch of events */
export async function bulkCreateEvents(events: TrackedEvent[]): Promise<void> {
  const eventsWithBotFlag = events.map(event => ({
    ...event,
    isBot: isBotUserAgent(event.userAgent),
  }));
  await EventModel.insertMany(eventsWithBotFlag, { ordered: false });
}

/** Find events by session ID */
export async function findEventsBySessionId(sessionId: string): Promise<IEvent[]> {
  return EventModel.find({ sessionId })
    .sort({ timestamp: 1 })
    .lean<IEvent[]>()
    .exec();
}

/** Find click points by URL path and query filter */
export async function findClicksByUrl(
  url: string,
  sessionId?: string,
  filters?: { convertedOnly?: boolean; conversionPath?: string; conversionEvent?: string; includeBots?: boolean }
): Promise<ClickPoint[]> {
  const query: any = { url, type: 'click' };
  
  if (!sessionId && filters?.includeBots !== true) {
    query.isBot = { $ne: true };
  }
  
  if (sessionId) {
    query.sessionId = sessionId;
  } else if (filters?.convertedOnly) {
    const sessionQuery: any = {};
    if (filters.includeBots !== true) {
      sessionQuery.isBot = { $ne: true };
    }
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

    if (filters.conversionPath) {
      sessionQuery.type = 'page_view';
      sessionQuery.url = { $regex: new RegExp(escapeRegExp(filters.conversionPath), 'i') };
    } else if (filters.conversionEvent) {
      sessionQuery.type = 'custom';
      sessionQuery['data.name'] = filters.conversionEvent;
    } else {
      sessionQuery.type = 'page_view';
      sessionQuery.url = { $regex: /success|thank|checkout/i };
    }
    const matchingSessions = await EventModel.find(sessionQuery).select('sessionId').lean().exec();
    const sessionIds = matchingSessions.map(s => s.sessionId);
    query.sessionId = { $in: sessionIds };
  }

  const docs = await EventModel.find(query)
    .select({ 
      'data.x': 1, 
      'data.y': 1, 
      'data.offsetX': 1, 
      'data.offsetY': 1, 
      'data.selector': 1, 
      _id: 0 
    })
    .lean()
    .exec();

  return docs
    .filter((doc: any) => doc.data && typeof doc.data.x === 'number' && typeof doc.data.y === 'number')
    .map((doc: any) => ({
      x: doc.data.x,
      y: doc.data.y,
      offsetX: doc.data.offsetX,
      offsetY: doc.data.offsetY,
      selector: doc.data.selector,
      count: 1
    }));
}

/** Find scroll attention data by URL path */
export async function findAttentionByUrl(url: string, sessionId?: string): Promise<Record<string, number>> {
  const query: any = { url, type: 'scroll_attention' };
  if (!sessionId) {
    query.isBot = { $ne: true };
  }
  if (sessionId) {
    query.sessionId = sessionId;
  }

  const docs = await EventModel.find(query)
    .select({ 'data.attentionMap': 1, _id: 0 })
    .lean()
    .exec();

  const aggregatedMap: Record<string, number> = {};
  for (const doc of docs) {
    if (doc.data && doc.data.attentionMap) {
      for (const [bandStr, count] of Object.entries(doc.data.attentionMap)) {
        if (typeof count === 'number') {
          aggregatedMap[bandStr] = (aggregatedMap[bandStr] || 0) + count;
        }
      }
    }
  }
  return aggregatedMap;
}

/** Find distinct URLs with click events */
export async function findDistinctClickUrls(): Promise<string[]> {
  return EventModel.distinct('url', { type: 'click', isBot: { $ne: true } }).exec();
}

/** Paginated event export */
export async function findExportEvents(filters: { startDate?: string; endDate?: string; page?: number; limit?: number }): Promise<{ total: number; events: IEvent[] }> {
  const query: any = {};
  if (filters.startDate || filters.endDate) {
    query.timestamp = {};
    if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
    if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate);
  }
  const page = filters.page || 1;
  const limit = filters.limit || 100;
  const skip = (page - 1) * limit;

  const total = await EventModel.countDocuments(query).exec();
  const events = await EventModel.find(query)
    .sort({ timestamp: -1 })
    .skip(skip)
    .limit(limit)
    .lean<IEvent[]>()
    .exec();

  return { total, events };
}
