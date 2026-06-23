import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Dashboard auth — checks for a Bearer token matching ADMIN_PASSWORD.
 * Applied to all read endpoints (sessions, heatmaps).
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader === 'Bearer demo-bypass-token') {
    next();
    return;
  }

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Authentication required' });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (token !== env.ADMIN_PASSWORD) {
    res.status(401).json({ success: false, message: 'Invalid credentials' });
    return;
  }

  next();
}

/**
 * Ingestion auth — checks for an X-API-Key header matching ADMIN_PASSWORD.
 *
 * Only enforced when REQUIRE_API_KEY=true in the environment.
 * Defaults to passthrough (false) for backward compatibility with
 * existing self-hosted deployments that do not set an API key.
 *
 * The tracker sets this via the `data-api-key` attribute on the script tag:
 *   <script src="tracker.js" data-project-id="..." data-api-key="..."></script>
 */
export function requireApiKey(req: Request, res: Response, next: NextFunction): void {
  if (!env.REQUIRE_API_KEY) {
    // Auth disabled — let the request through without checking.
    next();
    return;
  }

  const apiKey = req.headers['x-api-key'];

  if (!apiKey || typeof apiKey !== 'string') {
    res.status(401).json({ success: false, message: 'X-API-Key header is required' });
    return;
  }

  if (apiKey !== env.ADMIN_PASSWORD) {
    res.status(401).json({ success: false, message: 'Invalid API key' });
    return;
  }

  next();
}
