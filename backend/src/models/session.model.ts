import mongoose, { Document, Schema } from 'mongoose';

/**
 * Session documents are upserted (not inserted) on every event ingestion.
 * This means session metadata stays consistent without a separate
 * session-creation step in the client.
 */
export interface ISession extends Document {
  sessionId: string;
  visitorId: string;
  userAgent: string;
  firstSeen: Date;
  lastSeen: Date;
  eventCount: number;
  frustrationCount: number;
  isBot?: boolean;
  sessionDuration: number;
  bounce: boolean;
  pageViewsCount: number;
  deviceType?: string;
  country?: string;
  region?: string;
  city?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
}

const SessionSchema = new Schema<ISession>(
  {
    sessionId: { type: String, required: true, unique: true },
    visitorId: { type: String, default: 'unknown' },
    userAgent: { type: String, default: 'unknown' },
    firstSeen: { type: Date, required: true },
    lastSeen: { type: Date, required: true },
    eventCount: { type: Number, required: true, default: 0 },
    frustrationCount: { type: Number, required: true, default: 0 },
    isBot: { type: Boolean, default: false, index: true },
    sessionDuration: { type: Number, required: true, default: 0 },
    bounce: { type: Boolean, required: true, default: true },
    pageViewsCount: { type: Number, required: true, default: 0 },
    deviceType: { type: String },
    country: { type: String },
    region: { type: String },
    city: { type: String },
    utmSource: { type: String },
    utmMedium: { type: String },
    utmCampaign: { type: String },
  },
  {
    versionKey: false,
    strict: true,
  },
);

// Dashboard lists sessions ordered by most-recently-active first.
SessionSchema.index({ lastSeen: -1 });

export const SessionModel = mongoose.model<ISession>('Session', SessionSchema);
