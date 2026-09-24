"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.server = exports.app = void 0;
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const socket_io_1 = require("socket.io");
const env_1 = require("./config/env");
const socketHandler_1 = require("./sockets/socketHandler");
const tracking_controller_1 = require("./modules/tracking/tracking.controller");
const error_1 = require("./middleware/error");
// Import Route Modules
const auth_routes_1 = __importDefault(require("./modules/auth/auth.routes"));
const offices_routes_1 = __importDefault(require("./modules/offices/offices.routes"));
const vehicles_routes_1 = __importDefault(require("./modules/vehicles/vehicles.routes"));
const drivers_routes_1 = __importDefault(require("./modules/drivers/drivers.routes"));
const trips_routes_1 = __importDefault(require("./modules/trips/trips.routes"));
const fuel_routes_1 = __importDefault(require("./modules/fuel/fuel.routes"));
const maintenance_routes_1 = __importDefault(require("./modules/maintenance/maintenance.routes"));
const tracking_routes_1 = __importDefault(require("./modules/tracking/tracking.routes"));
const dashboard_routes_1 = __importDefault(require("./modules/dashboard/dashboard.routes"));
const chat_routes_1 = __importDefault(require("./modules/chat/chat.routes"));
const chat_controller_1 = require("./modules/chat/chat.controller");
const app = (0, express_1.default)();
exports.app = app;
const server = http_1.default.createServer(app);
exports.server = server;
// Setup Socket.io for Real-time GPS Telemetry
const io = new socket_io_1.Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
});
exports.io = io;
(0, socketHandler_1.initializeSockets)(io);
(0, tracking_controller_1.setTrackingIo)(io);
(0, chat_controller_1.setChatIo)(io);
// Middleware
app.use((0, cors_1.default)({ origin: '*' }));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Health Check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        system: 'Vehicle Management System (VMS) API Gateway',
        timestamp: new Date().toISOString(),
    });
});
// API Routes
app.use('/api/auth', auth_routes_1.default);
app.use('/api/offices', offices_routes_1.default);
app.use('/api/vehicles', vehicles_routes_1.default);
app.use('/api/drivers', drivers_routes_1.default);
app.use('/api/trips', trips_routes_1.default);
app.use('/api/fuel', fuel_routes_1.default);
app.use('/api/maintenance', maintenance_routes_1.default);
app.use('/api/tracking', tracking_routes_1.default);
app.use('/api/dashboard', dashboard_routes_1.default);
app.use('/api/chat', chat_routes_1.default);
// Error Handler Middleware
app.use(error_1.errorHandler);
// Start Server
const PORT = env_1.ENV.PORT;
server.listen(PORT, () => {
    console.log(`=======================================================`);
    console.log(`🚗 VMS Server running on http://localhost:${PORT}`);
    console.log(`📡 WebSocket Gateway ready for live telemetry`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`=======================================================`);
});
