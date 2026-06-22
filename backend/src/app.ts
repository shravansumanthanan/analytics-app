import express, { Application, Request, Response } from 'express';
import cors from 'cors';
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

  // ── CORS ────────────────────────────────────────────────────────────────────
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (e.g., curl, Postman, same-origin).
        if (!origin || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(new Error(`Origin '${origin}' not allowed by CORS`));
        }
      },
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  // ── Body parsing ─────────────────────────────────────────────────────────────
  app.use(express.json({ limit: '1mb' }));

  // ── Health check ─────────────────────────────────────────────────────────────
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

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
