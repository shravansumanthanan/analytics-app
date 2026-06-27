import { RecordingModel, IRecording } from '../models/recording.model';

export class RecordingRepository {
  async appendEvents(sessionId: string, events: Array<Record<string, unknown>>): Promise<IRecording | null> {
    return RecordingModel.findOneAndUpdate(
      { sessionId },
      {
        $push: { events: { $each: events } },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true, new: true }
    ).exec();
  }

  async findBySessionId(sessionId: string): Promise<IRecording | null> {
    return RecordingModel.findOne({ sessionId }).exec();
  }

  /** Delete all recording documents */
  async clear(): Promise<void> {
    await RecordingModel.deleteMany({}).exec();
  }

  /** Bulk insert raw recordings */
  async insertMany(recordings: unknown[]): Promise<void> {
    await RecordingModel.insertMany(recordings);
  }
}
