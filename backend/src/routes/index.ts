import { Router } from 'express';
import { EventController } from '../controllers/event.controller';
import { SessionController } from '../controllers/session.controller';
import { FunnelController } from '../controllers/funnel.controller';
import { RecordingController } from '../controllers/recording.controller';
import { UserController } from '../controllers/user.controller';
import { AnnotationController } from '../controllers/annotation.controller';
import { ExportController } from '../controllers/export.controller';
import { SeedController } from '../controllers/seed.controller';

import { SessionRepository } from '../repositories/session.repository';
import { EventRepository } from '../repositories/event.repository';
import { FunnelRepository } from '../repositories/funnel.repository';
import { AnnotationRepository } from '../repositories/annotation.repository';
import { RecordingRepository } from '../repositories/recording.repository';
import { UserRepository } from '../repositories/user.repository';

import { SessionService } from '../services/session.service';
import { EventService } from '../services/event.service';
import { FunnelService } from '../services/funnel.service';
import { AnnotationService } from '../services/annotation.service';
import { RecordingService } from '../services/recording.service';
import { UserService } from '../services/user.service';
import { ExportService } from '../services/export.service';
import { SeedService } from '../services/seed.service';

import { validate } from '../middleware/validate.middleware';
import { authenticate, requireApiKey } from '../middleware/auth.middleware';
import { ingestEventsSchema, heatmapQuerySchema } from '../schemas/event.schema';
import { createUserSchema } from '../schemas/user.schema';
import { createAnnotationSchema } from '../schemas/annotation.schema';

// ── Dependency Injection / composition root ──────────────────────────────────────
const sessionRepository = new SessionRepository();
const eventRepository = new EventRepository();
const funnelRepository = new FunnelRepository();
const annotationRepository = new AnnotationRepository();
const recordingRepository = new RecordingRepository();
const userRepository = new UserRepository();

const sessionService = new SessionService(sessionRepository);
const eventService = new EventService(eventRepository, sessionRepository);
const funnelService = new FunnelService(funnelRepository, sessionRepository, eventRepository);
const annotationService = new AnnotationService(annotationRepository);
const recordingService = new RecordingService(recordingRepository);
const userService = new UserService(userRepository);
const exportService = new ExportService(sessionRepository, eventRepository);
const seedService = new SeedService(sessionRepository, eventRepository, recordingRepository);

const eventController = new EventController(eventService);
const sessionController = new SessionController(sessionService);
const funnelController = new FunnelController(funnelService);
const recordingController = new RecordingController(recordingService);
const userController = new UserController(userService);
const annotationController = new AnnotationController(annotationService);
const exportController = new ExportController(exportService);
const seedController = new SeedController(seedService);

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

// ── Data Export API ──────────────────────────────────────────────────────────
router.get('/export/sessions', exportController.exportSessions);
router.get('/export/events', exportController.exportEvents);

// ── Demo Seeding ─────────────────────────────────────────────────────────────
router.post('/seed', authenticate, seedController.seed);
router.post('/clear', authenticate, seedController.clear);

export default router;
export { userService };
