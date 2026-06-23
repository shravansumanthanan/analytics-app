import { WebhookModel } from '../models/webhook.model';

export interface Webhook {
  id: string;
  url: string;
  createdAt: string;
}

/** Load registered webhooks from MongoDB. */
export async function getWebhooks(): Promise<Webhook[]> {
  try {
    const docs = await WebhookModel.find().lean().exec();
    return docs.map(doc => ({
      id: (doc as any)._id.toString(),
      url: doc.url,
      createdAt: doc.createdAt.toISOString()
    }));
  } catch (err) {
    console.error('AOS Webhooks: Failed to load webhooks', err);
    return [];
  }
}

/** Register a new webhook endpoint in MongoDB. */
export async function registerWebhook(url: string): Promise<Webhook> {
  const existing = await WebhookModel.findOne({ url }).lean().exec();
  if (existing) {
    return {
      id: (existing as any)._id.toString(),
      url: existing.url,
      createdAt: existing.createdAt.toISOString()
    };
  }

  const doc = await WebhookModel.create({ url });
  return {
    id: doc._id.toString(),
    url: doc.url,
    createdAt: doc.createdAt.toISOString()
  };
}

/** Delete a registered webhook from MongoDB. */
export async function deleteWebhook(id: string): Promise<boolean> {
  try {
    const result = await WebhookModel.deleteOne({ _id: id }).exec();
    return result.deletedCount > 0;
  } catch (err) {
    return false;
  }
}

/**
 * Dispatch an event to all registered webhooks asynchronously.
 */
export async function triggerWebhooks(eventType: string, payload: any): Promise<void> {
  const webhooks = await getWebhooks();
  if (webhooks.length === 0) return;

  const body = JSON.stringify({
    event: eventType,
    timestamp: new Date().toISOString(),
    data: payload,
  });

  const promises = webhooks.map(async (webhook) => {
    try {
      console.log(`AOS Webhooks: Sending webhook alert to ${webhook.url} for ${eventType}`);
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'AnalyticsOS-Webhook-Dispatcher/1.0',
        },
        body,
        signal: AbortSignal.timeout(5000), // 5s timeout limit
      });

      if (!response.ok) {
        console.warn(`AOS Webhooks: Delivery failed to ${webhook.url} (Status: ${response.status})`);
      } else {
        console.log(`AOS Webhooks: Successfully delivered webhook to ${webhook.url}`);
      }
    } catch (err) {
      console.error(`AOS Webhooks: Network error delivering to ${webhook.url}`, err);
    }
  });

  // Execute concurrently in background
  Promise.all(promises).catch(err => {
    console.error('AOS Webhooks: Dispatch queue error', err);
  });
}
