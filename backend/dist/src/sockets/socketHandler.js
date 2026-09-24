"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSockets = initializeSockets;
const db_1 = require("../config/db");
function initializeSockets(io) {
    io.on('connection', (socket) => {
        console.log(`[WebSocket] Client connected: ${socket.id}`);
        // Join Admin Fleet Room
        socket.on('join:admin', () => {
            socket.join('admin_fleet');
            console.log(`[WebSocket] Socket ${socket.id} joined admin_fleet`);
            socket.emit('joined:admin', { success: true });
        });
        // Join Specific Trip Room (for Employee or Driver)
        socket.on('join:trip', ({ tripId }) => {
            if (tripId) {
                socket.join(`trip_${tripId}`);
                console.log(`[WebSocket] Socket ${socket.id} joined trip_${tripId}`);
            }
        });
        // Driver streams live GPS location
        socket.on('location:update', async (data) => {
            try {
                const { tripId, vehicleId, driverId, lat, lng, speed = 0, heading = 0 } = data;
                const telemetryPayload = {
                    tripId,
                    vehicleId,
                    driverId,
                    latitude: lat,
                    longitude: lng,
                    speed,
                    heading,
                    timestamp: new Date().toISOString(),
                };
                // 1. Instantly broadcast to admin fleet dashboard and trip channel
                io.to('admin_fleet').emit('vehicle:location', telemetryPayload);
                io.to(`trip_${tripId}`).emit('vehicle:location', telemetryPayload);
                // 2. Persist driver's latest position in background
                if (driverId) {
                    await db_1.prisma.driver.update({
                        where: { id: driverId },
                        data: {
                            currentLat: lat,
                            currentLng: lng,
                            lastLocationAt: new Date(),
                        },
                    }).catch(() => { });
                }
                // 3. Save breadcrumb tracking point for the trip route
                if (tripId) {
                    await db_1.prisma.trackingPoint.create({
                        data: {
                            tripId,
                            driverId: driverId || 'unknown',
                            latitude: lat,
                            longitude: lng,
                            speed,
                            heading,
                        },
                    }).catch(() => { });
                }
            }
            catch (error) {
                console.error('[WebSocket] Error processing location update:', error);
            }
        });
        // Trip status updates broadcast
        socket.on('trip:status_change', (data) => {
            io.to('admin_fleet').emit('trip:updated', data);
            io.to(`trip_${data.tripId}`).emit('trip:updated', data);
        });
        // ==================== REAL-TIME CHAT EVENTS ====================
        // Join a conversation room
        socket.on('chat:join', ({ conversationId }) => {
            if (conversationId) {
                socket.join(`chat_${conversationId}`);
                console.log(`[WebSocket] Socket ${socket.id} joined chat_${conversationId}`);
            }
        });
        // Leave a conversation room
        socket.on('chat:leave', ({ conversationId }) => {
            if (conversationId) {
                socket.leave(`chat_${conversationId}`);
                console.log(`[WebSocket] Socket ${socket.id} left chat_${conversationId}`);
            }
        });
        // Send a real-time message
        socket.on('chat:send', async (data) => {
            try {
                const { conversationId, senderId, body, messageType = 'TEXT', attachmentUrl } = data;
                if (!conversationId || !senderId || !body || body.trim() === '') {
                    return;
                }
                // 1. Persist message in database
                const message = await db_1.prisma.chatMessage.create({
                    data: {
                        conversationId,
                        senderId,
                        body: body.trim(),
                        messageType: messageType || 'TEXT',
                        attachmentUrl: attachmentUrl || null,
                    },
                    include: {
                        sender: {
                            select: { id: true, name: true, role: true, department: true },
                        },
                    },
                });
                // 2. Update conversation updatedAt timestamp
                await db_1.prisma.conversation.update({
                    where: { id: conversationId },
                    data: { updatedAt: new Date() },
                });
                // 3. Update sender's lastReadAt
                await db_1.prisma.convParticipant.updateMany({
                    where: { conversationId, userId: senderId },
                    data: { lastReadAt: new Date() },
                });
                // 4. Broadcast immediately to the conversation room
                io.to(`chat_${conversationId}`).emit('chat:message', message);
                // 5. Notify admin fleet for inbox updates / unread badges
                io.to('admin_fleet').emit('chat:unread_update', {
                    conversationId,
                    messageId: message.id,
                });
            }
            catch (error) {
                console.error('[WebSocket] Error handling chat:send:', error);
            }
        });
        // Typing indicator
        socket.on('chat:typing', (data) => {
            if (data.conversationId) {
                socket.to(`chat_${data.conversationId}`).emit('chat:typing_indicator', {
                    conversationId: data.conversationId,
                    userName: data.userName,
                    isTyping: data.isTyping,
                });
            }
        });
        // Read receipt
        socket.on('chat:read', async (data) => {
            try {
                const { conversationId, userId } = data;
                if (conversationId && userId) {
                    await db_1.prisma.convParticipant.updateMany({
                        where: { conversationId, userId },
                        data: { lastReadAt: new Date() },
                    });
                    io.to(`chat_${conversationId}`).emit('chat:read_receipt', {
                        conversationId,
                        userId,
                        readAt: new Date().toISOString(),
                    });
                }
            }
            catch (error) {
                console.error('[WebSocket] Error handling chat:read:', error);
            }
        });
        socket.on('disconnect', () => {
            console.log(`[WebSocket] Client disconnected: ${socket.id}`);
        });
    });
}
