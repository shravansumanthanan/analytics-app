import { Request, Response, NextFunction } from 'express';
import { getWebhooks, registerWebhook, deleteWebhook } from '../services/webhook.service';

export class WebhookController {
  getAll = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const webhooks = await getWebhooks();
      res.json({ success: true, data: webhooks });
    } catch (err) {
      next(err);
    }
  };

  create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { url } = req.body;
      if (!url || typeof url !== 'string' || !url.startsWith('http')) {
        res.status(400).json({ success: false, message: 'Invalid URL. Must start with http or https.' });
        return;
      }
      const webhook = await registerWebhook(url);
      res.status(201).json({ success: true, data: webhook });
    } catch (err) {
      next(err);
    }
  };

  delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const success = await deleteWebhook(id);
      if (!success) {
        res.status(404).json({ success: false, message: 'Webhook not found' });
        return;
      }
      res.json({ success: true, message: 'Webhook deleted successfully' });
    } catch (err) {
      next(err);
    }
  };
}
