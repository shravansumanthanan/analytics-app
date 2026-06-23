import { Request, Response, NextFunction } from 'express';
import { AnnotationService } from '../services/annotation.service';

export class AnnotationController {
  constructor(private readonly annotationService: AnnotationService) {}

  getBySession = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id: sessionId } = req.params;
      const annotations = await this.annotationService.getAnnotations(sessionId);
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
      const annotation = await this.annotationService.createAnnotation(sessionId, req.body);
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
      await this.annotationService.deleteAnnotation(id);
      res.json({ success: true, message: 'Annotation deleted successfully' });
    } catch (err) {
      next(err);
    }
  };
}
