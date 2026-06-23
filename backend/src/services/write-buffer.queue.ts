import type { TrackedEvent } from '../types/event.types';
import { EventRepository } from '../repositories/event.repository';
import { SessionRepository } from '../repositories/session.repository';
import { resolveIpLocation } from './geolocation.service';
import { parseDeviceType } from '../utils/ua-parser';
import { getSocketIO } from '../socket';

export class WriteBufferQueue {
  private queue: Array<{ event: TrackedEvent; ip?: string }> = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private isProcessing = false;
  private readonly maxBufferSize = 100;
  private readonly flushIntervalMs = 2000;

  constructor(
    private readonly eventRepo: EventRepository,
    private readonly sessionRepo: SessionRepository,
  ) {
    this.startInterval();
    this.registerShutdownHandlers();
  }

  /** Add an array of events to the write-buffer queue. */
  add(events: TrackedEvent[], ip?: string): void {
    for (const event of events) {
      this.queue.push({ event, ip });
    }

    if (this.queue.length >= this.maxBufferSize) {
      // Trigger async flush if buffer limit exceeded
      this.flush().catch(err => {
        console.error('AOS WriteBufferQueue: Auto-flush error', err);
      });
    }
  }

  private startInterval() {
    this.flushInterval = setInterval(() => {
      this.flush().catch(err => {
        console.error('AOS WriteBufferQueue: Interval flush error', err);
      });
    }, this.flushIntervalMs);
  }

  /** Flush the current queue buffer and write to the database in bulk. */
  async flush(): Promise<void> {
    if (this.queue.length === 0 || this.isProcessing) return;

    this.isProcessing = true;
    const batch = [...this.queue];
    this.queue = [];

    try {
      // Group and enrich events by ip
      const enrichedEvents = batch.map(({ event, ip }) => {
        const geo = ip ? resolveIpLocation(ip) : { country: 'Unknown', region: 'Unknown', city: 'Unknown' };
        const ev = event as any;

        let utmSource: string | undefined;
        let utmMedium: string | undefined;
        let utmCampaign: string | undefined;
        let utmTerm: string | undefined;
        let utmContent: string | undefined;

        try {
          const urlObj = new URL(event.url);
          utmSource = urlObj.searchParams.get('utm_source') || undefined;
          utmMedium = urlObj.searchParams.get('utm_medium') || undefined;
          utmCampaign = urlObj.searchParams.get('utm_campaign') || undefined;
          utmTerm = urlObj.searchParams.get('utm_term') || undefined;
          utmContent = urlObj.searchParams.get('utm_content') || undefined;
        } catch (e) {
          // Ignore
        }

        const deviceType = parseDeviceType(event.userAgent);

        return {
          ...event,
          utmSource,
          utmMedium,
          utmCampaign,
          utmTerm,
          utmContent,
          deviceType,
          country: geo.country,
          region: geo.region,
          city: geo.city,
        };
      });

      // Write to database in single concurrent block
      await Promise.all([
        this.eventRepo.bulkCreate(enrichedEvents as any),
        this.sessionRepo.bulkUpsert(enrichedEvents as any),
      ]);

      // Trigger socket broadcasts
      try {
        const io = getSocketIO();
        io.emit('new-events', enrichedEvents);
      } catch (e) {
        // Socket.IO may not be running/initialized
      }

      // Trigger webhooks for frustration events in this batch
      const frustrationEvents = enrichedEvents.filter(
        e => e.type === 'rage_click' || e.type === 'dead_click' || e.type === 'js_error'
      );
      if (frustrationEvents.length > 0) {
        // Dynamically import webhook dispatcher to avoid circular dependency
        const { triggerWebhooks } = await import('./webhook.service');
        for (const fe of frustrationEvents) {
          triggerWebhooks(fe.type, fe).catch(err => {
            console.error('AOS WriteBufferQueue: Webhook trigger error', err);
          });
        }
      }

    } catch (err) {
      console.error('AOS WriteBufferQueue: Failed to flush event batch, restoring to queue', err);
      // Restore the items back to the queue to prevent data loss
      this.queue.unshift(...batch);
    } finally {
      this.isProcessing = false;
    }
  }

  private registerShutdownHandlers() {
    const shutdown = async () => {
      if (this.flushInterval) {
        clearInterval(this.flushInterval);
      }
      console.log('AOS WriteBufferQueue: Shutting down, flushing remaining events...');
      await this.flush();
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  }
}
