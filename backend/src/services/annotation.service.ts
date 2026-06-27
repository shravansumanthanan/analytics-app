import { AnnotationRepository } from '../repositories/annotation.repository';
import { IAnnotation } from '../models/annotation.model';

export class AnnotationService {
  constructor(private annotationRepository: AnnotationRepository) {}

  async getAnnotationsBySession(sessionId: string): Promise<IAnnotation[]> {
    return this.annotationRepository.findBySessionId(sessionId);
  }

  async createAnnotation(data: {
    sessionId: string;
    timestampMs: number;
    note: string;
    author: string;
  }): Promise<IAnnotation> {
    return this.annotationRepository.create(data);
  }

  async deleteAnnotation(id: string): Promise<IAnnotation | null> {
    return this.annotationRepository.deleteById(id);
  }
}
