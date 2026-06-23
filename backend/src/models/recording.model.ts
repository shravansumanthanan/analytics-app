import mongoose, { Document, Schema } from 'mongoose';

export interface IRecording extends Document {
  sessionId: string;
  events: Array<Record<string, any>>;
  createdAt: Date;
}

const RecordingSchema = new Schema<IRecording>(
  {
    sessionId: { type: String, required: true, unique: true, index: true },
    events: { type: [Schema.Types.Mixed] as any, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
    strict: true,
  }
);

export const RecordingModel = mongoose.model<IRecording>('Recording', RecordingSchema);
