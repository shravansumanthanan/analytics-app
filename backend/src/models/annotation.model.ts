import mongoose, { Document, Schema } from 'mongoose';

export interface IAnnotation extends Document {
  sessionId: string;
  timestampMs: number;
  absoluteTimestamp: Date;
  note: string;
  author: string;
  createdAt: Date;
}

const AnnotationSchema = new Schema<IAnnotation>(
  {
    sessionId: { type: String, required: true, index: true },
    timestampMs: { type: Number, required: true },
    absoluteTimestamp: { type: Date, required: true, default: Date.now },
    note: { type: String, required: true },
    author: { type: String, required: true, default: 'Admin' },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  {
    versionKey: false,
    strict: true,
  }
);

// We often query annotations for a session ordered by playback time offset.
AnnotationSchema.index({ sessionId: 1, timestampMs: 1 });

export const AnnotationModel = mongoose.model<IAnnotation>('Annotation', AnnotationSchema);
