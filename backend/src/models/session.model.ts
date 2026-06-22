import mongoose, { Document, Schema } from 'mongoose';

/**
 * Session documents are upserted (not inserted) on every event ingestion.
 * This means session metadata stays consistent without a separate
 * session-creation step in the client.
 */
export interface ISession extends Document {
  sessionId: string;
  firstSeen: Date;
  lastSeen: Date;
  eventCount: number;
}

const SessionSchema = new Schema<ISession>(
  {
    sessionId: { type: String, required: true, unique: true },
    firstSeen: { type: Date, required: true },
    lastSeen: { type: Date, required: true },
    eventCount: { type: Number, required: true, default: 0 },
  },
  {
    versionKey: false,
    strict: true,
  },
);

// Dashboard lists sessions ordered by most-recently-active first.
SessionSchema.index({ lastSeen: -1 });

export const SessionModel = mongoose.model<ISession>('Session', SessionSchema);
