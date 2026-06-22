import { Router } from 'express';
import { EventController } from '../controllers/event.controller';
import { SessionController } from '../controllers/session.controller';
import { EventRepository } from '../repositories/event.repository';
import { SessionRepository } from '../repositories/session.repository';
import { EventService } from '../services/event.service';
import { SessionService } from '../services/session.service';
import { validate } from '../middleware/validate.middleware';
import { authenticate } from '../middleware/auth.middleware';
import { ingestEventsSchema, heatmapQuerySchema } from '../schemas/event.schema';

/**
 * Wire up the dependency graph and mount routes.
 *
 * Composition root: repositories → services → controllers → routes.
 * Everything above is unaware of how its dependencies are constructed.
 */
const eventRepo = new EventRepository();
const sessionRepo = new SessionRepository();
const eventService = new EventService(eventRepo, sessionRepo);
const sessionService = new SessionService(sessionRepo);
const eventController = new EventController(eventService, sessionService);
const sessionController = new SessionController(sessionService);

const router = Router();

// ── Events ────────────────────────────────────────────────────────────────────
router.post(
  '/events',
  validate('body', ingestEventsSchema),
  eventController.ingest,
);

// ── Sessions ──────────────────────────────────────────────────────────────────
router.get('/sessions', authenticate, sessionController.getAll);
router.get('/sessions/:id/events', authenticate, eventController.getSessionEvents);

// ── Heatmap ───────────────────────────────────────────────────────────────────
router.get('/heatmap/urls', authenticate, eventController.getTrackedUrls);
router.get(
  '/heatmap',
  authenticate,
  validate('query', heatmapQuerySchema),
  eventController.getHeatmap,
);

export default router;
