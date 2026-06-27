import { Router } from 'express';
import { EventController } from '../controllers/event.controller';
import { SessionController } from '../controllers/session.controller';
import { FunnelController } from '../controllers/funnel.controller';
import { RecordingController } from '../controllers/recording.controller';
import { UserController } from '../controllers/user.controller';
import { AnnotationController } from '../controllers/annotation.controller';
import { ExportController } from '../controllers/export.controller';
import { SeedController } from '../controllers/seed.controller';

import { validate } from '../middleware/validate.middleware';
import { authenticate, requireApiKey } from '../middleware/auth.middleware';
import { ingestEventsSchema, heatmapQuerySchema } from '../schemas/event.schema';
import { createUserSchema } from '../schemas/user.schema';
import { createAnnotationSchema } from '../schemas/annotation.schema';

const eventController = new EventController();
const sessionController = new SessionController();
const funnelController = new FunnelController();
const recordingController = new RecordingController();
const userController = new UserController();
const annotationController = new AnnotationController();
const exportController = new ExportController();
const seedController = new SeedController();

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
