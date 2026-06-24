import { io } from 'socket.io-client';
import { API_BASE_URL } from './client';

// The socket server is at the same domain/port as the API
const socketUrl = API_BASE_URL.replace('/api', '');

export const socket = io(socketUrl, {
  autoConnect: true,
  withCredentials: true,
  // Fallback to polling if WebSocket fails (important for some cloud platforms)
  transports: ['websocket', 'polling'],
  path: '/socket.io/',
});
