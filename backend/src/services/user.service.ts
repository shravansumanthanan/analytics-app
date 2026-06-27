import { UserRepository } from '../repositories/user.repository';
import { ConflictError, NotFoundError } from '../middleware/app-error';
import { IUser, UserRole } from '../models/user.model';

export class UserService {
  constructor(private userRepository: UserRepository) {}

  async getAllUsers(): Promise<IUser[]> {
    return this.userRepository.findAll();
  }

  async createUser(data: { email: string; name: string; role: UserRole }): Promise<IUser> {
    const existing = await this.userRepository.findByEmail(data.email);
    if (existing) {
      throw new ConflictError(`User with email '${data.email}' already exists`);
    }
    return this.userRepository.create(data);
  }

  async deleteUser(id: string): Promise<IUser> {
    const deleted = await this.userRepository.deleteById(id);
    if (!deleted) {
      throw new NotFoundError(`User with ID '${id}' not found`);
    }
    return deleted;
  }

  async seedUsers(): Promise<void> {
    const users = await this.userRepository.findAll();
    if (users.length === 0) {
      console.log('🌱 Seeding default team users...');
      await this.userRepository.create({
        email: 'admin@analyticsos.com',
        name: 'Sarah Jenkins',
        role: 'admin',
      });
      await this.userRepository.create({
        email: 'member@analyticsos.com',
        name: 'Alex Rivera',
        role: 'member',
      });
      console.log('✅ Default team users seeded.');
    }
  }
}
