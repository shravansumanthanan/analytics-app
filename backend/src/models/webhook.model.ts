import mongoose, { Document, Schema } from 'mongoose';

export interface IWebhook extends Document {
  url: string;
  createdAt: Date;
}

const WebhookSchema = new Schema<IWebhook>(
  {
    url: { type: String, required: true, unique: true },
    createdAt: { type: Date, default: Date.now },
  },
  {
    versionKey: false,
    strict: true,
  }
);

export const WebhookModel = mongoose.model<IWebhook>('Webhook', WebhookSchema);
