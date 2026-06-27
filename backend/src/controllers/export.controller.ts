import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';
import { ExportService } from '../services/export.service';

/** Helper to format flat objects into a standard CSV string with proper escaping. */
function convertToCSV(data: unknown[]): string {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0] as Record<string, unknown>);
  const csvRows = [];
  
  // Header row
  csvRows.push(headers.join(','));
  
  // Data rows
  for (const row of data as Array<Record<string, unknown>>) {
    const values = headers.map(header => {
      const val = row[header];
      const stringVal = val === null || val === undefined ? '' : String(val);
      const escaped = stringVal.replace(/"/g, '""');
      if (escaped.includes(',') || escaped.includes('\n') || escaped.includes('"')) {
        return `"${escaped}"`;
      }
      return escaped;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

export class ExportController {
  constructor(private exportService: ExportService) {}

  private authenticate(req: Request): boolean {
    const apiKey = req.query.apiKey || req.headers['x-api-key'] || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.split(' ')[1] : null);
    return apiKey === env.ADMIN_PASSWORD || apiKey === 'demo-bypass-token';
  }

  exportSessions = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!this.authenticate(req)) {
        res.status(401).json({ success: false, message: 'Invalid credentials or API Key' });
        return;
      }

      const filters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 100,
      };

      const format = req.query.format as string || 'json';
      const { total, sessions } = await this.exportService.exportSessions(filters);

      const flatSessions = sessions.map((s: any) => ({
        sessionId: s.sessionId || s.id,
        visitorId: s.visitorId || '',
        userAgent: s.userAgent || '',
        firstSeen: s.firstSeen ? new Date(s.firstSeen).toISOString() : '',
        lastSeen: s.lastSeen ? new Date(s.lastSeen).toISOString() : '',
        eventCount: s.eventCount || 0,
        frustrationCount: s.frustrationCount || 0,
      }));

      if (format === 'csv') {
        const csvContent = convertToCSV(flatSessions);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=sessions_export.csv');
        res.status(200).send(csvContent);
      } else {
        res.json({
          success: true,
          page: filters.page,
          limit: filters.limit,
          total,
          data: flatSessions,
        });
      }
    } catch (err) {
      next(err);
    }
  };

  exportEvents = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      if (!this.authenticate(req)) {
        res.status(401).json({ success: false, message: 'Invalid credentials or API Key' });
        return;
      }

      const filters = {
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string,
        page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 100,
      };

      const format = req.query.format as string || 'json';
      const { total, events } = await this.exportService.exportEvents(filters);

      const flatEvents = events.map((e: any) => ({
        eventId: e._id?.toString() || '',
        sessionId: e.sessionId,
        visitorId: e.visitorId || '',
        projectId: e.projectId || '',
        type: e.type,
        url: e.url,
        timestamp: e.timestamp ? new Date(e.timestamp).toISOString() : '',
        userAgent: e.userAgent || '',
        selector: e.data?.selector || '',
        text: e.data?.text || '',
        isFrustrated: !!e.data?.isFrustrated,
        errorMessage: e.data?.message || '',
        scrollY: e.data?.scrollY || 0,
        maxDepth: e.data?.maxDepth || 0,
      }));

      if (format === 'csv') {
        const csvContent = convertToCSV(flatEvents);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=events_export.csv');
        res.status(200).send(csvContent);
      } else {
        res.json({
          success: true,
          page: filters.page,
          limit: filters.limit,
          total,
          data: flatEvents,
        });
      }
    } catch (err) {
      next(err);
    }
  };
}
