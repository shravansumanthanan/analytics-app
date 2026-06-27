import { UserModel, IUser, UserRole } from '../models/user.model';

export class UserRepository {
  async findAll(): Promise<IUser[]> {
    return UserModel.find().sort({ createdAt: -1 }).lean<IUser[]>().exec();
  }

  async findByEmail(email: string): Promise<IUser | null> {
    return UserModel.findOne({ email }).exec();
  }

  async create(data: { email: string; name: string; role: UserRole }): Promise<IUser> {
    return UserModel.create(data);
  }

  async deleteById(id: string): Promise<IUser | null> {
    return UserModel.findByIdAndDelete(id).exec();
  }
}
