import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/user.model';
import { ConflictError, NotFoundError } from '../middleware/app-error';

export class UserController {
  getAll = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const users = await UserModel.find().sort({ createdAt: -1 }).lean().exec();
      res.json({ success: true, data: users });
    } catch (err) {
      next(err);
    }
  };

  create = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { email, name, role } = req.body;
      const existing = await UserModel.findOne({ email }).exec();
      if (existing) {
        throw new ConflictError(`User with email '${email}' already exists`);
      }
      const user = await UserModel.create({ email, name, role });
      res.status(201).json({ success: true, data: user });
    } catch (err) {
      next(err);
    }
  };

  delete = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { id } = req.params;
      const deleted = await UserModel.findByIdAndDelete(id).exec();
      if (!deleted) {
        throw new NotFoundError(`User with ID '${id}' not found`);
      }
      res.json({ success: true, message: 'User deleted successfully' });
    } catch (err) {
      next(err);
    }
  };
}

export async function seedUsers(): Promise<void> {
  const users = await UserModel.find().exec();
  if (users.length === 0) {
    console.log('🌱 Seeding default team users...');
    await UserModel.create({
      email: 'admin@analyticsos.com',
      name: 'Sarah Jenkins',
      role: 'admin',
    });
    await UserModel.create({
      email: 'member@analyticsos.com',
      name: 'Alex Rivera',
      role: 'member',
    });
    console.log('✅ Default team users seeded.');
  }
}
