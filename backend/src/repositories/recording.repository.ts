import { RecordingModel, IRecording } from '../models/recording.model';

export class RecordingRepository {
  /**
   * Append events to a session's recording.
   * If the recording doesn't exist, it will be created.
   */
  async appendEvents(sessionId: string, events: any[]): Promise<void> {
    await RecordingModel.findOneAndUpdate(
      { sessionId },
      {
        $push: { events: { $each: events } },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true, new: true }
    ).exec();
  }

  /**
   * Find the recording for a given session.
   */
  async findBySessionId(sessionId: string): Promise<IRecording | null> {
    return RecordingModel.findOne({ sessionId }).exec();
  }
}
