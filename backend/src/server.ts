import express from 'express';
import http from 'http';
import cors from 'cors';
import { Server as SocketIOServer } from 'socket.io';
import { ENV } from './config/env';
import { initializeSockets } from './sockets/socketHandler';
import { setTrackingIo } from './modules/tracking/tracking.controller';
import { errorHandler } from './middleware/error';

// Import Route Modules
import authRoutes from './modules/auth/auth.routes';
import officeRoutes from './modules/offices/offices.routes';
import vehicleRoutes from './modules/vehicles/vehicles.routes';
import driverRoutes from './modules/drivers/drivers.routes';
import tripRoutes from './modules/trips/trips.routes';
import fuelRoutes from './modules/fuel/fuel.routes';
import maintenanceRoutes from './modules/maintenance/maintenance.routes';
import trackingRoutes from './modules/tracking/tracking.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import chatRoutes from './modules/chat/chat.routes';
import { setChatIo } from './modules/chat/chat.controller';
import notificationRoutes from './modules/notifications/notifications.routes';
import { setNotificationIo } from './modules/notifications/notifications.controller';

const app = express();
const server = http.createServer(app);

// Setup Socket.io for Real-time GPS Telemetry
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

initializeSockets(io);
setTrackingIo(io);
setChatIo(io);
setNotificationIo(io);

import path from 'path';

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    system: 'Vehicle Management System (VMS) API Gateway',
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/offices', officeRoutes);
app.use('/api/vehicles', vehicleRoutes);
app.use('/api/drivers', driverRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/fuel', fuelRoutes);
app.use('/api/maintenance', maintenanceRoutes);
app.use('/api/tracking', trackingRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notifications', notificationRoutes);

// Error Handler Middleware
app.use(errorHandler);

// Start Server
const PORT = ENV.PORT;
server.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`[VMS Server] Running on http://localhost:${PORT}`);
  console.log(`[WebSocket] Gateway ready for live telemetry`);
  console.log(`[Health] Health check: http://localhost:${PORT}/api/health`);
  console.log(`=======================================================`);
});

export { app, server, io };
