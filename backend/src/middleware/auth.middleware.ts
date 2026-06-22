import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

/**
 * Basic authentication middleware that checks for a Bearer token
 * matching the ADMIN_PASSWORD environment variable.
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  
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
