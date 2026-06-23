import { Router } from 'express';
import { EventController } from '../controllers/event.controller';
import { SessionController } from '../controllers/session.controller';
import { FunnelController } from '../controllers/funnel.controller';
import { RecordingController } from '../controllers/recording.controller';
import { UserController } from '../controllers/user.controller';
import { AnnotationController } from '../controllers/annotation.controller';
import { IntegrationController } from '../controllers/integration.controller';
import { ExportController } from '../controllers/export.controller';

import { EventRepository } from '../repositories/event.repository';
import { SessionRepository } from '../repositories/session.repository';
import { UserRepository } from '../repositories/user.repository';
import { AnnotationRepository } from '../repositories/annotation.repository';

import { EventService } from '../services/event.service';
import { SessionService } from '../services/session.service';
import { UserService } from '../services/user.service';
import { AnnotationService } from '../services/annotation.service';

import { validate } from '../middleware/validate.middleware';
import { authenticate, requireApiKey } from '../middleware/auth.middleware';
import { ingestEventsSchema, heatmapQuerySchema } from '../schemas/event.schema';
import { createUserSchema } from '../schemas/user.schema';
import { createAnnotationSchema } from '../schemas/annotation.schema';

/**
 * Wire up the dependency graph and mount routes.
 *
 * Composition root: repositories → services → controllers → routes.
 * Everything above is unaware of how its dependencies are constructed.
 */
const eventRepo = new EventRepository();
const sessionRepo = new SessionRepository();
const userRepo = new UserRepository();
const annotationRepo = new AnnotationRepository();

const eventService = new EventService(eventRepo, sessionRepo);
const sessionService = new SessionService(sessionRepo);
export const userService = new UserService(userRepo); // Exported to allow seeding on server startup
const annotationService = new AnnotationService(annotationRepo);

const eventController = new EventController(eventService, sessionService);
const sessionController = new SessionController(sessionService);
const funnelController = new FunnelController();
const recordingController = new RecordingController();
const userController = new UserController(userService);
const annotationController = new AnnotationController(annotationService);
const integrationController = new IntegrationController(sessionService, eventService);
const exportController = new ExportController(sessionService, eventService);

const router = Router();

// ── Events ────────────────────────────────────────────────────────────────────
router.post(
  '/events',
  requireApiKey,
  validate('body', ingestEventsSchema),
  eventController.ingest,
);

// ── Sessions ──────────────────────────────────────────────────────────────────
router.get('/sessions', authenticate, sessionController.getAll);
router.get('/sessions/:id/events', authenticate, eventController.getSessionEvents);
router.post('/sessions/:id/recording', requireApiKey, recordingController.ingest);
router.get('/sessions/:id/recording', authenticate, recordingController.get);

// ── Heatmap ───────────────────────────────────────────────────────────────────
router.get('/heatmap/urls', authenticate, eventController.getTrackedUrls);
router.get(
  '/heatmap',
  authenticate,
  validate('query', heatmapQuerySchema),
  eventController.getHeatmap,
);

// ── Funnels ───────────────────────────────────────────────────────────────────
router.post('/funnels', authenticate, funnelController.create);
router.get('/funnels', authenticate, funnelController.getAll);
router.get('/funnels/:id/analysis', authenticate, funnelController.analyze);

// ── Team Management ──────────────────────────────────────────────────────────
router.get('/users', authenticate, userController.getAll);
router.post('/users', authenticate, validate('body', createUserSchema), userController.create);
router.delete('/users/:id', authenticate, userController.delete);

// ── Annotations & Notes ───────────────────────────────────────────────────────
router.get('/sessions/:id/annotations', authenticate, annotationController.getBySession);
router.post('/sessions/:id/annotations', authenticate, validate('body', createAnnotationSchema), annotationController.create);
router.delete('/annotations/:id', authenticate, annotationController.delete);

// ── Integrations (Power BI) ──────────────────────────────────────────────────
router.get('/integrations/powerbi', integrationController.getPowerBiData);

// ── Data Export API ──────────────────────────────────────────────────────────
router.get('/export/sessions', exportController.exportSessions);
router.get('/export/events', exportController.exportEvents);

export default router;
