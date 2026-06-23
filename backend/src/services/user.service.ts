import { UserRepository } from '../repositories/user.repository';
import { IUser } from '../models/user.model';
import { ConflictError, NotFoundError } from '../middleware/app-error';

export class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  async getAllUsers(): Promise<IUser[]> {
    return this.userRepo.findAll();
  }

  async createUser(userData: { email: string; name: string; role: 'admin' | 'member' }): Promise<IUser> {
    const existing = await this.userRepo.findByEmail(userData.email);
    if (existing) {
      throw new ConflictError(`User with email '${userData.email}' already exists`);
    }
    return this.userRepo.create(userData);
  }

  async deleteUser(id: string): Promise<void> {
    const deleted = await this.userRepo.delete(id);
    if (!deleted) {
      throw new NotFoundError(`User with ID '${id}' not found`);
    }
  }

  /**
   * Seed default team members on startup if the database is empty.
   * This demonstrates team management role concepts out-of-the-box.
   */
  async seedUsers(): Promise<void> {
    const users = await this.userRepo.findAll();
    if (users.length === 0) {
      console.log('🌱 Seeding default team users...');
      await this.userRepo.create({
        email: 'admin@analyticsos.com',
        name: 'Sarah Jenkins',
        role: 'admin',
      });
      await this.userRepo.create({
        email: 'member@analyticsos.com',
        name: 'Alex Rivera',
        role: 'member',
      });
      console.log('✅ Default team users seeded.');
    }
  }
}
