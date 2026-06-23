import { AnnotationRepository } from '../repositories/annotation.repository';
import { IAnnotation } from '../models/annotation.model';
import { NotFoundError } from '../middleware/app-error';

export class AnnotationService {
  constructor(private readonly annotationRepo: AnnotationRepository) {}

  async getAnnotations(sessionId: string): Promise<IAnnotation[]> {
    return this.annotationRepo.findBySessionId(sessionId);
  }

  async createAnnotation(
    sessionId: string,
    annotationData: { timestampMs: number; note: string; author: string }
  ): Promise<IAnnotation> {
    return this.annotationRepo.create({
      sessionId,
      timestampMs: annotationData.timestampMs,
      absoluteTimestamp: new Date(),
      note: annotationData.note,
      author: annotationData.author,
    });
  }

  async deleteAnnotation(id: string): Promise<void> {
    const deleted = await this.annotationRepo.delete(id);
    if (!deleted) {
      throw new NotFoundError(`Annotation with ID '${id}' not found`);
    }
  }
}
