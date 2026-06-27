import { AnnotationModel, IAnnotation } from '../models/annotation.model';

export class AnnotationRepository {
  async findBySessionId(sessionId: string): Promise<IAnnotation[]> {
    return AnnotationModel.find({ sessionId })
      .sort({ timestampMs: 1 })
      .lean<IAnnotation[]>()
      .exec();
  }

  async create(data: {
    sessionId: string;
    timestampMs: number;
    note: string;
    author: string;
  }): Promise<IAnnotation> {
    return AnnotationModel.create({
      sessionId: data.sessionId,
      timestampMs: data.timestampMs,
      absoluteTimestamp: new Date(),
      note: data.note,
      author: data.author,
    });
  }

  async deleteById(id: string): Promise<IAnnotation | null> {
    return AnnotationModel.findByIdAndDelete(id).exec();
  }
}
