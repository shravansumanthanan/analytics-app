import { RecordingRepository } from '../repositories/recording.repository';
import { IRecording } from '../models/recording.model';

export class RecordingService {
  constructor(private recordingRepository: RecordingRepository) {}

  async appendEvents(sessionId: string, events: Array<Record<string, unknown>>): Promise<IRecording | null> {
    return this.recordingRepository.appendEvents(sessionId, events);
  }

  async getRecordingEvents(sessionId: string): Promise<Array<Record<string, unknown>>> {
    const recording = await this.recordingRepository.findBySessionId(sessionId);
    return recording?.events ?? [];
  }
}
