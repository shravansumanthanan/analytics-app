import mongoose, { Document, Schema } from 'mongoose';
import type { EventType } from '../types/event.types';

/**
 * IEvent is the Mongoose document interface.
 * We keep the domain type (TrackedEvent) separate from the persistence
 * type (IEvent) so the repository layer can translate between them.
 */
export interface IEvent extends Document {
  sessionId: string;
  visitorId?: string;
  projectId?: string;
  type: EventType;
  url: string;
  timestamp: Date;
  userAgent?: string;
  data?: Record<string, any>;
}

const EventSchema = new Schema<IEvent>(
  {
    sessionId: { type: String, required: true, index: true },
    visitorId: { type: String },
    projectId: { type: String },
    type: { type: String, enum: ['page_view', 'click', 'custom'] as EventType[], required: true },
    url: { type: String, required: true },
    timestamp: { type: Date, required: true },
    userAgent: { type: String },
    data: { type: Schema.Types.Mixed },
  },
  {
    // Disable Mongoose's default __v field; we don't use optimistic concurrency here.
    versionKey: false,
    // Store documents exactly as defined — no extra fields.
    strict: true,
  },
);

/**
 * Compound index: fetching a session's ordered event timeline is the
 * hottest read path, so (sessionId, timestamp) covers it entirely.
 */
EventSchema.index({ sessionId: 1, timestamp: 1 });

/**
 * Heatmap queries filter on (url, type) and return only (x, y).
 * This index makes those scans index-only.
 */
EventSchema.index({ url: 1, type: 1 });

export const EventModel = mongoose.model<IEvent>('Event', EventSchema);
