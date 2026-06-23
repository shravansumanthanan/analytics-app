import { Server as HttpServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { env } from './config/env';

let io: SocketIOServer | null = null;

/**
 * Initialize the Socket.IO server attached to the HTTP server
 */
export function initSocketServer(server: HttpServer): void {
  const allowedOrigins = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim().replace(/\/$/, ''));

  io = new SocketIOServer(server, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST', 'OPTIONS'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Join room for session live viewing
    socket.on('join-session-room', (sessionId: string) => {
      socket.join(`session:${sessionId}`);
      console.log(`[Socket] Client ${socket.id} joined room session:${sessionId}`);
    });

    // Receive live telemetry / recording events from tracker and broadcast
    socket.on('live-recording-event', (data: { sessionId: string; events: any[] }) => {
      if (data && data.sessionId && data.events) {
        socket.to(`session:${data.sessionId}`).emit('live-recording-stream', data.events);
      }
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });
}

/**
 * Get the initialized Socket.IO instance
 */
export function getSocketIO(): SocketIOServer {
  if (!io) {
    throw new Error('Socket.IO has not been initialized. Please call initSocketServer first.');
  }
  return io;
}
