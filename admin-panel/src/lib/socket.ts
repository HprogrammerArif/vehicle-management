import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io('https://vehicle-management-a6yi.onrender.com', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('[Socket] Connected to VMS Real-time Telemetry Gateway:', socket?.id);
      socket?.emit('join:admin');
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected from telemetry gateway');
    });
  }

  return socket;
};
