import fs from 'fs';
import path from 'path';

const WEBHOOKS_FILE = path.join(__dirname, '../../config/webhooks.json');

export interface Webhook {
  id: string;
  url: string;
  createdAt: string;
}

// Ensure the config directory exists
function ensureConfigDir() {
  const dir = path.dirname(WEBHOOKS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

/** Load registered webhooks from disk. */
export function getWebhooks(): Webhook[] {
  try {
    ensureConfigDir();
    if (!fs.existsSync(WEBHOOKS_FILE)) {
      return [];
    }
    const data = fs.readFileSync(WEBHOOKS_FILE, 'utf8');
    return JSON.parse(data) as Webhook[];
  } catch (err) {
    console.error('AOS Webhooks: Failed to load webhooks config', err);
    return [];
  }
}

/** Save registered webhooks to disk. */
export function saveWebhooks(webhooks: Webhook[]): void {
  try {
    ensureConfigDir();
    fs.writeFileSync(WEBHOOKS_FILE, JSON.stringify(webhooks, null, 2), 'utf8');
  } catch (err) {
    console.error('AOS Webhooks: Failed to save webhooks config', err);
  }
}

/** Register a new webhook endpoint. */
export function registerWebhook(url: string): Webhook {
  const webhooks = getWebhooks();
  
  // Prevent duplicate urls
  const existing = webhooks.find(w => w.url === url);
  if (existing) return existing;

  const newWebhook: Webhook = {
    id: Math.random().toString(36).substring(2, 9),
    url,
    createdAt: new Date().toISOString(),
  };

  webhooks.push(newWebhook);
  saveWebhooks(webhooks);
  return newWebhook;
}

/** Delete a registered webhook. */
export function deleteWebhook(id: string): boolean {
  const webhooks = getWebhooks();
  const index = webhooks.findIndex(w => w.id === id);
  if (index === -1) return false;

  webhooks.splice(index, 1);
  saveWebhooks(webhooks);
  return true;
}

/**
 * Dispatch an event to all registered webhooks asynchronously.
 * Uses fetch to send a JSON POST body with the event type and payload.
 */
export async function triggerWebhooks(eventType: string, payload: any): Promise<void> {
  const webhooks = getWebhooks();
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
