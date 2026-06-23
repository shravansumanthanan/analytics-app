import mongoose from 'mongoose';
import { env } from './env';

/**
 * Establishes the MongoDB connection once at application startup.
 * Mongoose buffers commands until connected, so the app layer does not
 * need to guard against the connection not being ready.
 */
export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    // Log only the host, not the full URI (which may contain credentials)
    const safeUri = env.MONGODB_URI.replace(/:\/\/[^@]*@/, '://***@');
    console.log('✅ MongoDB connected:', safeUri);
  });
  mongoose.connection.on('error', (err) =>
    console.error('❌ MongoDB connection error:', err),
  );
  mongoose.connection.on('disconnected', () =>
    console.warn('⚠️  MongoDB disconnected'),
  );

  await mongoose.connect(env.MONGODB_URI);
}

/** Graceful teardown for process exit / test cleanup. */
export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
