import { createApp } from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { initSocketServer } from './socket';
import { userService } from './routes/index';

async function bootstrap(): Promise<void> {
  await connectDatabase();
  try {
    await userService.seedUsers();
  } catch (seedErr) {
    console.error('⚠️ User seeding failed:', seedErr);
  }

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    console.log(`🚀 Server running on http://localhost:${env.PORT}`);
    console.log(`   Environment: ${env.NODE_ENV}`);
  });

  // Initialize WebSockets
  initSocketServer(server);

  /**
   * Graceful shutdown: stop accepting new connections, wait for in-flight
   * requests to drain, then close the DB connection.
   */
  const shutdown = (signal: string) => {
    console.log(`\n${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      console.log('HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
