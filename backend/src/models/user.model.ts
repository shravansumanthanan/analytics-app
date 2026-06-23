import mongoose, { Document, Schema } from 'mongoose';

export type UserRole = 'admin' | 'member';

export interface IUser extends Document {
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true },
    role: { type: String, enum: ['admin', 'member'], required: true, default: 'member' },
    createdAt: { type: Date, required: true, default: Date.now },
  },
  {
    versionKey: false,
    strict: true,
  }
);

export const UserModel = mongoose.model<IUser>('User', UserSchema);
