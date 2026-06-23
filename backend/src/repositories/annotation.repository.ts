import { AnnotationModel, IAnnotation } from '../models/annotation.model';

export class AnnotationRepository {
  async create(data: Partial<IAnnotation>): Promise<IAnnotation> {
    const annotation = new AnnotationModel(data);
    return annotation.save();
  }

  async findBySessionId(sessionId: string): Promise<IAnnotation[]> {
    return AnnotationModel.find({ sessionId })
      .sort({ timestampMs: 1 })
      .lean<IAnnotation[]>()
      .exec();
  }

  async delete(id: string): Promise<boolean> {
    const result = await AnnotationModel.findByIdAndDelete(id).exec();
    return result !== null;
  }
}
