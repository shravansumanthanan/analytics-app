import { Request, Response, NextFunction } from 'express';
import { AnnotationService } from '../services/annotation.service';
import { NotFoundError } from '../middleware/app-error';

export class AnnotationController {
  constructor(private annotationService: AnnotationService) {}

  getBySession = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id: sessionId } = req.params;
      const annotations = await this.annotationService.getAnnotationsBySession(sessionId);
      res.json({ success: true, data: annotations });
    } catch (err) {
      next(err);
    }
  };

  create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id: sessionId } = req.params;
      const { timestampMs, note, author } = req.body;
      const annotation = await this.annotationService.createAnnotation({
        sessionId,
        timestampMs,
        note,
        author: author || 'Anonymous',
      });
      res.status(201).json({ success: true, data: annotation });
    } catch (err) {
      next(err);
    }
  };

  delete = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await this.annotationService.deleteAnnotation(id);
      if (!deleted) {
        throw new NotFoundError(`Annotation with ID '${id}' not found`);
      }
      res.json({ success: true, message: 'Annotation deleted successfully' });
    } catch (err) {
      next(err);
    }
  };
}
