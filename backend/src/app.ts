import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { env } from './config/env';
import router from './routes/index';
import { errorMiddleware } from './middleware/error.middleware';

/**
 * Creates and configures the Express application.
 * Kept separate from server.ts so it can be imported in tests without
 * starting a real HTTP server.
 */
export function createApp(): Application {
  const app = express();

  // ── Security Headers (Helmet) ───────────────────────────────────────────────
  app.use(helmet());

  // ── Rate Limiting ────────────────────────────────────────────────────────────
  const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per `window` (per 15 minutes)
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
    message: { success: false, message: 'Too many requests from this IP, please try again later.' }
  });
  app.use(globalLimiter);

  // ── CORS ────────────────────────────────────────────────────────────────────
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim().replace(/\/$/, ''));
  app.use((req, res, next) => {
    // Permissive CORS for the public tracking ingestion endpoint
    if (req.path === '/api/events') {
      cors({
        origin: '*',
        methods: ['POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type'],
      })(req, res, next);
    } else {
      // Strict CORS for dashboard and other private endpoints
      cors({
        origin: (origin, callback) => {
          if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
          } else {
            // Block origin by returning false, which blocks headers on client side
            // instead of throwing an Error and crashing the request stream.
            callback(null, false);
          }
        },
        methods: ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization'],
      })(req, res, next);
    }
  });

  // ── Body parsing ─────────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb', type: ['application/json', 'text/plain'] }));

  // ── Health check ─────────────────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Serve the tracker folder statically
  app.use(express.static(path.join(__dirname, '../../tracker')));

  // ── API routes ───────────────────────────────────────────────────────────────
  app.use('/api', router);

  // ── 404 handler ──────────────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, message: 'Route not found' });
  });

  // ── Global error handler (must be last) ──────────────────────────────────────
  app.use(errorMiddleware);

  return app;
}
