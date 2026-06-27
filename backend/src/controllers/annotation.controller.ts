import { Request, Response, NextFunction } from 'express';
import { AnnotationModel } from '../models/annotation.model';
import { NotFoundError } from '../middleware/app-error';

export class AnnotationController {
  getBySession = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id: sessionId } = req.params;
      const annotations = await AnnotationModel.find({ sessionId })
        .sort({ timestampMs: 1 })
        .lean()
        .exec();
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
      const annotation = await AnnotationModel.create({
        sessionId,
        timestampMs,
        absoluteTimestamp: new Date(),
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
      const deleted = await AnnotationModel.findByIdAndDelete(id).exec();
      if (!deleted) {
        throw new NotFoundError(`Annotation with ID '${id}' not found`);
      }
      res.json({ success: true, message: 'Annotation deleted successfully' });
    } catch (err) {
      next(err);
    }
  };
}
