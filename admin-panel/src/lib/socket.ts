import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io('http://localhost:5000', {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('⚡ Connected to VMS Real-time Telemetry Gateway:', socket?.id);
      socket?.emit('join:admin');
    });

    socket.on('disconnect', () => {
      console.log('🔌 Disconnected from telemetry gateway');
    });
  }

  return socket;
};
