import { Request, Response } from 'express';
import { prisma } from '../../config/db';
import { Server as SocketIOServer } from 'socket.io';

let ioInstance: SocketIOServer | null = null;
export const setNotificationIo = (io: SocketIOServer) => {
  ioInstance = io;
};

export const emitNotification = (payload: {
  userIds: string[];
  title: string;
  body: string;
  type: string;
  data?: any;
}) => {
  if (ioInstance) {
    const notifPayload = {
      title: payload.title,
      body: payload.body,
      type: payload.type,
      recipientUserIds: payload.userIds,
      data: payload.data,
      createdAt: new Date().toISOString(),
    };
    // Broadcast globally so connected clients filter by recipientUserIds
    ioInstance.emit('notification:new', notifPayload);
    // Also emit directly to individual user rooms
    if (payload.userIds && payload.userIds.length > 0) {
      for (const uId of payload.userIds) {
        ioInstance.to(`user_${uId}`).emit('notification:new', notifPayload);
      }
    }
  }
};

// GET /notifications/my — logged-in user's notification inbox
export const getMyNotifications = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false });

    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, isRead: false },
    });

    return res.json({ success: true, data: notifications, unreadCount });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};

// PATCH /notifications/:id/read
export const markNotificationRead = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;

    await prisma.notification.updateMany({
      where: { id, userId },
      data: { isRead: true },
    });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to mark notification read' });
  }
};

// PATCH /notifications/read-all
export const markAllRead = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ success: false });

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to mark all read' });
  }
};

// POST /notifications/send — Admin sends notification to target audience
export const sendNotification = async (req: Request, res: Response) => {
  try {
    const adminId = req.user?.userId;
    if (!adminId || req.user?.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Admin only' });
    }

    const { title, body, type = 'GENERAL', target, tripId, userId, employeeId } = req.body;
    // target options: 'ALL' | 'ALL_EMPLOYEES' | 'ALL_DRIVERS' | 'TRIP' | 'USER' | specific ID

    if (!title || !body || !target) {
      return res.status(400).json({ success: false, message: 'title, body, and target are required' });
    }

    let userIds: string[] = [];

    if (target === 'ALL') {
      const users = await prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
      userIds = users.map((u) => u.id);
    } else if (target === 'ALL_EMPLOYEES') {
      const users = await prisma.user.findMany({
        where: { role: 'EMPLOYEE', isActive: true },
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    } else if (target === 'ALL_DRIVERS') {
      const users = await prisma.user.findMany({
        where: { role: 'DRIVER', isActive: true },
        select: { id: true },
      });
      userIds = users.map((u) => u.id);
    } else if (target === 'TRIP') {
      // Find all parties involved in the trip: requester, assigned driver user, accompanying colleagues
      const targetTripId = (tripId || req.body.targetId || '').trim();
      if (!targetTripId) {
        return res.status(400).json({ success: false, message: 'tripId is required when target is TRIP' });
      }

      // First check if it's an exact trip ID
      let trip = await prisma.trip.findUnique({
        where: { id: targetTripId },
        include: {
          driver: { select: { userId: true } },
          passengers: { select: { userId: true, employeeId: true, email: true } },
        },
      });

      // If not found by primary ID, maybe the admin provided a driver's employeeId, license, or vehicle reg
      if (!trip) {
        trip = await prisma.trip.findFirst({
          where: {
            OR: [
              { driver: { user: { employeeId: { equals: targetTripId, mode: 'insensitive' } } } },
              { driver: { licenseNumber: { equals: targetTripId, mode: 'insensitive' } } },
              { driverId: targetTripId },
              { requester: { employeeId: { equals: targetTripId, mode: 'insensitive' } } },
              { vehicle: { registrationNo: { equals: targetTripId, mode: 'insensitive' } } },
            ],
            status: { in: ['IN_PROGRESS', 'APPROVED', 'PENDING'] },
          },
          orderBy: { updatedAt: 'desc' },
          include: {
            driver: { select: { userId: true } },
            passengers: { select: { userId: true, employeeId: true, email: true } },
          },
        });
      }

      if (!trip) {
        return res.status(404).json({ success: false, message: 'Trip not found' });
      }

      const recipientSet = new Set<string>();
      if (trip.requesterId) recipientSet.add(trip.requesterId);
      if (trip.driver?.userId) recipientSet.add(trip.driver.userId);
      for (const p of trip.passengers) {
        if (p.userId) {
          recipientSet.add(p.userId);
        } else if (p.employeeId || p.email) {
          // Resolve passenger by employeeId or email
          const pUser = await prisma.user.findFirst({
            where: {
              OR: [
                p.employeeId ? { employeeId: { equals: p.employeeId, mode: 'insensitive' } } : {},
                p.email ? { email: { equals: p.email, mode: 'insensitive' } } : {},
              ],
            },
            select: { id: true },
          });
          if (pUser) recipientSet.add(pUser.id);
        }
      }
      userIds = Array.from(recipientSet);
    } else if (target === 'USER' || employeeId || userId) {
      const targetUser = (userId || employeeId || req.body.targetId || '').trim();
      if (!targetUser) {
        return res.status(400).json({ success: false, message: 'User identifier is required when target is USER' });
      }

      // Flexible lookup: ID, case-insensitive employeeId, email, exact name, or partial name
      let user = await prisma.user.findFirst({
        where: {
          OR: [
            { id: targetUser },
            { employeeId: { equals: targetUser, mode: 'insensitive' } },
            { email: { equals: targetUser, mode: 'insensitive' } },
            { name: { equals: targetUser, mode: 'insensitive' } },
          ],
          isActive: true,
        },
        select: { id: true },
      });

      // If still not found, check if it's a Driver table ID or driver's license number
      if (!user) {
        const driver = await prisma.driver.findFirst({
          where: {
            OR: [
              { id: targetUser },
              { licenseNumber: { equals: targetUser, mode: 'insensitive' } },
            ],
          },
          select: { userId: true },
        });
        if (driver?.userId) {
          user = { id: driver.userId };
        }
      }

      // If still not found, try partial name search
      if (!user) {
        user = await prisma.user.findFirst({
          where: {
            name: { contains: targetUser, mode: 'insensitive' },
            isActive: true,
          },
          select: { id: true },
        });
      }

      if (!user) {
        return res.status(404).json({ success: false, message: `Target user '${targetUser}' not found` });
      }
      userIds = [user.id];
    } else {
      // Direct user ID or employee ID fallback
      const targetStr = (target || '').trim();
      const user = await prisma.user.findFirst({
        where: {
          OR: [
            { id: targetStr },
            { employeeId: { equals: targetStr, mode: 'insensitive' } },
            { email: { equals: targetStr, mode: 'insensitive' } },
          ],
          isActive: true,
        },
        select: { id: true },
      });
      if (user) {
        userIds = [user.id];
      } else {
        userIds = [targetStr];
      }
    }

    if (userIds.length === 0) {
      return res.status(400).json({ success: false, message: 'No recipients matched the target criteria' });
    }

    const notifications = await prisma.notification.createMany({
      data: userIds.map((uId) => ({
        userId: uId,
        title,
        body,
        type,
      })),
    });

    // Real-time broadcast via WebSocket
    if (ioInstance) {
      const notifData = {
        title,
        body,
        type,
        target,
        recipientUserIds: userIds,
        createdAt: new Date().toISOString(),
      };
      // Broadcast globally so all connected clients filter
      ioInstance.emit('notification:new', notifData);

      // Also broadcast directly into user rooms
      for (const uId of userIds) {
        ioInstance.to(`user_${uId}`).emit('notification:new', notifData);
      }
    }

    return res.json({ success: true, count: notifications.count, recipients: userIds.length });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to send notification' });
  }
};
