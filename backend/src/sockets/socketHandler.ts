import { Server as SocketIOServer, Socket } from 'socket.io';
import { prisma } from '../config/db';

interface OnlineUser {
  socketId: string;
  userId: string;
  name: string;
  role: string;
  lastSeen: Date;
}

// In-memory presence map: socketId -> OnlineUser
const activeSockets = new Map<string, OnlineUser>();
// Rate limiting map: socketId -> array of message timestamps
const messageRateMap = new Map<string, number[]>();

function getOnlineUserIds(): string[] {
  const ids = new Set<string>();
  for (const u of activeSockets.values()) {
    ids.add(u.userId);
  }
  return Array.from(ids);
}

export function initializeSockets(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Broadcast current online user list to newly connected socket
    socket.emit('presence:sync', { onlineUserIds: getOnlineUserIds() });

    // Client registers their active identity
    socket.on('user:online', (data: { userId: string; name: string; role: string }) => {
      if (!data?.userId) return;
      activeSockets.set(socket.id, {
        socketId: socket.id,
        userId: data.userId,
        name: data.name || 'User',
        role: data.role || 'EMPLOYEE',
        lastSeen: new Date(),
      });
      socket.join(`user_${data.userId}`);
      if (data.role) {
        socket.join(`role_${data.role}`);
      }
      console.log(`[WebSocket] User online: ${data.name} (${data.userId})`);
      io.emit('presence:sync', { onlineUserIds: getOnlineUserIds() });
    });

    // Request presence update on demand
    socket.on('presence:get', () => {
      socket.emit('presence:sync', { onlineUserIds: getOnlineUserIds() });
    });

    // Join Admin Fleet Room
    socket.on('join:admin', () => {
      socket.join('admin_fleet');
      console.log(`[WebSocket] Socket ${socket.id} joined admin_fleet`);
      socket.emit('joined:admin', { success: true });
    });

    // Join Specific Trip Room (for Employee or Driver)
    socket.on('join:trip', ({ tripId }: { tripId: string }) => {
      if (tripId) {
        socket.join(`trip_${tripId}`);
        console.log(`[WebSocket] Socket ${socket.id} joined trip_${tripId}`);
      }
    });

    // Driver streams live GPS location
    socket.on(
      'location:update',
      async (data: {
        tripId: string;
        vehicleId: string;
        driverId: string;
        lat: number;
        lng: number;
        speed?: number;
        heading?: number;
        odometer?: number;
      }) => {
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
            await prisma.driver.update({
              where: { id: driverId },
              data: {
                currentLat: lat,
                currentLng: lng,
                lastLocationAt: new Date(),
              },
            }).catch(() => {});
          }

          // 3. Save breadcrumb tracking point for the trip route
          if (tripId) {
            await prisma.trackingPoint.create({
              data: {
                tripId,
                driverId: driverId || 'unknown',
                latitude: lat,
                longitude: lng,
                speed,
                heading,
              },
            }).catch(() => {});
          }
        } catch (error) {
          console.error('[WebSocket] Error processing location update:', error);
        }
      }
    );

    // Trip status updates broadcast
    socket.on('trip:status_change', (data: { tripId: string; status: string }) => {
      io.to('admin_fleet').emit('trip:updated', data);
      io.to(`trip_${data.tripId}`).emit('trip:updated', data);
    });

    // ==================== REAL-TIME CHAT EVENTS ====================

    // Join a conversation room
    socket.on('chat:join', ({ conversationId }: { conversationId: string }) => {
      if (conversationId) {
        socket.join(`chat_${conversationId}`);
        console.log(`[WebSocket] Socket ${socket.id} joined chat_${conversationId}`);
      }
    });

    // Leave a conversation room
    socket.on('chat:leave', ({ conversationId }: { conversationId: string }) => {
      if (conversationId) {
        socket.leave(`chat_${conversationId}`);
        console.log(`[WebSocket] Socket ${socket.id} left chat_${conversationId}`);
      }
    });

    // Send a real-time message with size validation & rate-limiting protection
    socket.on(
      'chat:send',
      async (data: {
        conversationId: string;
        senderId: string;
        body: string;
        messageType?: any;
        attachmentUrl?: string;
      }) => {
        try {
          const { conversationId, senderId, body, messageType = 'TEXT', attachmentUrl } = data;

          if (!conversationId || !senderId || !body || body.trim() === '') {
            return;
          }

          // Safeguard: Max 5000 chars per message
          const trimmedBody = body.trim().slice(0, 5000);

          // Safeguard: Rate limit to 10 messages per 5 seconds
          const now = Date.now();
          const timestamps = (messageRateMap.get(socket.id) || []).filter((t) => now - t < 5000);
          if (timestamps.length >= 10) {
            socket.emit('chat:error', { message: 'Too many messages sent. Please slow down.' });
            return;
          }
          timestamps.push(now);
          messageRateMap.set(socket.id, timestamps);

          // 1. Persist message in database
          const message = await prisma.chatMessage.create({
            data: {
              conversationId,
              senderId,
              body: trimmedBody,
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
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { updatedAt: new Date() },
          });

          // 3. Update sender's lastReadAt
          await prisma.convParticipant.updateMany({
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
        } catch (error) {
          console.error('[WebSocket] Error handling chat:send:', error);
          socket.emit('chat:error', { message: 'Failed to send message' });
        }
      }
    );

    // Typing indicator
    socket.on(
      'chat:typing',
      (data: { conversationId: string; userName: string; isTyping: boolean }) => {
        if (data?.conversationId) {
          socket.to(`chat_${data.conversationId}`).emit('chat:typing_indicator', {
            conversationId: data.conversationId,
            userName: data.userName,
            isTyping: data.isTyping,
          });
        }
      }
    );

    // Read receipt
    socket.on(
      'chat:read',
      async (data: { conversationId: string; userId: string }) => {
        try {
          const { conversationId, userId } = data;
          if (conversationId && userId) {
            await prisma.convParticipant.updateMany({
              where: { conversationId, userId },
              data: { lastReadAt: new Date() },
            });

            io.to(`chat_${conversationId}`).emit('chat:read_receipt', {
              conversationId,
              userId,
              readAt: new Date().toISOString(),
            });
          }
        } catch (error) {
          console.error('[WebSocket] Error handling chat:read:', error);
        }
      }
    );

    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
      activeSockets.delete(socket.id);
      messageRateMap.delete(socket.id);
      io.emit('presence:sync', { onlineUserIds: getOnlineUserIds() });
    });
  });
}

