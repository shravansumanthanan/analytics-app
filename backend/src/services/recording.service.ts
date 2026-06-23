import { RecordingRepository } from '../repositories/recording.repository';

export class RecordingService {
  private recordingRepo: RecordingRepository;

  constructor() {
    this.recordingRepo = new RecordingRepository();
  }

  async addEvents(sessionId: string, events: any[]): Promise<void> {
    if (!sessionId || !events || events.length === 0) return;
    await this.recordingRepo.appendEvents(sessionId, events);
  }

  async getRecording(sessionId: string) {
    const recording = await this.recordingRepo.findBySessionId(sessionId);
    return recording ? recording.events : [];
  }
}
