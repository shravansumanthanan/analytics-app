import mongoose, { Document, Schema } from 'mongoose';
import type { EventType } from '../types/event.types';

/**
 * IEvent is the Mongoose document interface.
 * We keep the domain type (TrackedEvent) separate from the persistence
 * type (IEvent) so the repository layer can translate between them.
 */
export interface IEvent extends Document {
  sessionId: string;
  type: EventType;
  url: string;
  timestamp: Date;
  userAgent?: string;
  x?: number;
  y?: number;
}

const EventSchema = new Schema<IEvent>(
  {
    sessionId: { type: String, required: true, index: true },
    type: { type: String, enum: ['page_view', 'click'] as EventType[], required: true },
    url: { type: String, required: true },
    timestamp: { type: Date, required: true },
    userAgent: { type: String },
    // x/y are only present for click events — stored as nullable at DB layer.
    x: { type: Number },
    y: { type: Number },
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
