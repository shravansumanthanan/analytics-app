import mongoose, { Document, Schema } from 'mongoose';

export interface IFunnel extends Document {
  name: string;
  steps: string[];
  createdAt: Date;
}

const FunnelSchema = new Schema<IFunnel>(
  {
    name: { type: String, required: true },
    steps: { type: [String], required: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
    strict: true,
  }
);

export const FunnelModel = mongoose.model<IFunnel>('Funnel', FunnelSchema);
