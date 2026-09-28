import { io, Socket } from 'socket.io-client';

// For local physical device testing, change to your machine LAN IP e.g. 'http://192.168.1.100:5000'
const SOCKET_URL = 'https://vehicle-management-a6yi.onrender.com';
// const SOCKET_URL = 'http://10.10.29.137:5000';

let socket: Socket | null = null;

export const getMobileSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    socket.on('connect', () => {
      console.log('Mobile Socket connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('Mobile Socket disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.warn('Mobile Socket connection error:', error.message);
    });
  }

  return socket;
};
