"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendNotification = exports.markAllRead = exports.markNotificationRead = exports.getMyNotifications = exports.emitNotification = exports.setNotificationIo = void 0;
const db_1 = require("../../config/db");
let ioInstance = null;
const setNotificationIo = (io) => {
    ioInstance = io;
};
exports.setNotificationIo = setNotificationIo;
const emitNotification = (payload) => {
    if (ioInstance) {
        ioInstance.emit('notification:new', {
            title: payload.title,
            body: payload.body,
            type: payload.type,
            recipientUserIds: payload.userIds,
            data: payload.data,
            createdAt: new Date().toISOString(),
        });
    }
};
exports.emitNotification = emitNotification;
// GET /notifications/my — logged-in user's notification inbox
const getMyNotifications = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ success: false });
        const notifications = await db_1.prisma.notification.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        const unreadCount = await db_1.prisma.notification.count({
            where: { userId, isRead: false },
        });
        return res.json({ success: true, data: notifications, unreadCount });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
    }
};
exports.getMyNotifications = getMyNotifications;
// PATCH /notifications/:id/read
const markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        await db_1.prisma.notification.updateMany({
            where: { id, userId },
            data: { isRead: true },
        });
        return res.json({ success: true });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to mark notification read' });
    }
};
exports.markNotificationRead = markNotificationRead;
// PATCH /notifications/read-all
const markAllRead = async (req, res) => {
    try {
        const userId = req.user?.userId;
        if (!userId)
            return res.status(401).json({ success: false });
        await db_1.prisma.notification.updateMany({
            where: { userId, isRead: false },
            data: { isRead: true },
        });
        return res.json({ success: true });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to mark all read' });
    }
};
exports.markAllRead = markAllRead;
// POST /notifications/send — Admin sends notification to target audience
const sendNotification = async (req, res) => {
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
        let userIds = [];
        if (target === 'ALL') {
            const users = await db_1.prisma.user.findMany({ where: { isActive: true }, select: { id: true } });
            userIds = users.map((u) => u.id);
        }
        else if (target === 'ALL_EMPLOYEES') {
            const users = await db_1.prisma.user.findMany({
                where: { role: 'EMPLOYEE', isActive: true },
                select: { id: true },
            });
            userIds = users.map((u) => u.id);
        }
        else if (target === 'ALL_DRIVERS') {
            const users = await db_1.prisma.user.findMany({
                where: { role: 'DRIVER', isActive: true },
                select: { id: true },
            });
            userIds = users.map((u) => u.id);
        }
        else if (target === 'TRIP') {
            // Find all parties involved in the trip: requester, assigned driver user, accompanying colleagues
            const targetTripId = tripId || req.body.targetId;
            if (!targetTripId) {
                return res.status(400).json({ success: false, message: 'tripId is required when target is TRIP' });
            }
            const trip = await db_1.prisma.trip.findUnique({
                where: { id: targetTripId },
                include: {
                    driver: { select: { userId: true } },
                    passengers: { select: { userId: true } },
                },
            });
            if (!trip) {
                return res.status(404).json({ success: false, message: 'Trip not found' });
            }
            const recipientSet = new Set();
            if (trip.requesterId)
                recipientSet.add(trip.requesterId);
            if (trip.driver?.userId)
                recipientSet.add(trip.driver.userId);
            for (const p of trip.passengers) {
                if (p.userId)
                    recipientSet.add(p.userId);
            }
            userIds = Array.from(recipientSet);
        }
        else if (target === 'USER' || employeeId || userId) {
            const targetUser = userId || employeeId || req.body.targetId;
            const user = await db_1.prisma.user.findFirst({
                where: {
                    OR: [
                        { id: targetUser },
                        { employeeId: targetUser },
                        { email: targetUser },
                    ],
                    isActive: true,
                },
                select: { id: true },
            });
            if (!user) {
                return res.status(404).json({ success: false, message: 'Target user not found' });
            }
            userIds = [user.id];
        }
        else {
            // Direct user ID or employee ID fallback
            const user = await db_1.prisma.user.findFirst({
                where: {
                    OR: [{ id: target }, { employeeId: target }],
                    isActive: true,
                },
                select: { id: true },
            });
            if (user) {
                userIds = [user.id];
            }
            else {
                userIds = [target];
            }
        }
        if (userIds.length === 0) {
            return res.status(400).json({ success: false, message: 'No recipients matched the target criteria' });
        }
        const notifications = await db_1.prisma.notification.createMany({
            data: userIds.map((uId) => ({
                userId: uId,
                title,
                body,
                type,
            })),
        });
        // Real-time broadcast via WebSocket if available
        if (ioInstance) {
            ioInstance.emit('notification:new', {
                title,
                body,
                type,
                target,
                recipientUserIds: userIds,
                createdAt: new Date().toISOString(),
            });
        }
        return res.json({ success: true, count: notifications.count, recipients: userIds.length });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to send notification' });
    }
};
exports.sendNotification = sendNotification;
