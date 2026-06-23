import { FunnelModel, IFunnel } from '../models/funnel.model';

export class FunnelRepository {
  async create(name: string, steps: string[]): Promise<IFunnel> {
    return FunnelModel.create({ name, steps });
  }

  async findAll(): Promise<IFunnel[]> {
    return FunnelModel.find().sort({ createdAt: -1 });
  }

  async findById(id: string): Promise<IFunnel | null> {
    return FunnelModel.findById(id);
  }
}
