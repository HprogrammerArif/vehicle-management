"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveLeave = exports.requestLeave = exports.updateDriverStatus = exports.getDriverById = exports.getAvailableDrivers = exports.getDrivers = void 0;
const db_1 = require("../../config/db");
const getDrivers = async (req, res) => {
    try {
        const { status } = req.query;
        const where = {};
        if (status)
            where.status = status;
        const drivers = await db_1.prisma.driver.findMany({
            where,
            include: {
                user: {
                    select: { id: true, name: true, email: true, phone: true, profilePhoto: true, isActive: true },
                },
                _count: {
                    select: { assignedTrips: true, fuelLogs: true, leaveRequests: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ success: true, data: drivers });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch drivers' });
    }
};
exports.getDrivers = getDrivers;
const getAvailableDrivers = async (req, res) => {
    try {
        const drivers = await db_1.prisma.driver.findMany({
            where: { status: 'AVAILABLE' },
            include: {
                user: { select: { id: true, name: true, phone: true, email: true } },
            },
        });
        return res.json({ success: true, data: drivers });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch available drivers' });
    }
};
exports.getAvailableDrivers = getAvailableDrivers;
const getDriverById = async (req, res) => {
    try {
        const { id } = req.params;
        const driver = await db_1.prisma.driver.findUnique({
            where: { id },
            include: {
                user: true,
                assignedTrips: {
                    take: 10,
                    orderBy: { departureAt: 'desc' },
                    include: {
                        vehicle: true,
                        fromOffice: true,
                        toOffice: true,
                        requester: { select: { name: true, phone: true } },
                    },
                },
                leaveRequests: {
                    orderBy: { createdAt: 'desc' },
                },
                fuelLogs: {
                    take: 5,
                    orderBy: { loggedAt: 'desc' },
                },
            },
        });
        if (!driver) {
            return res.status(404).json({ success: false, message: 'Driver not found' });
        }
        return res.json({ success: true, data: driver });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch driver' });
    }
};
exports.getDriverById = getDriverById;
const updateDriverStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const driver = await db_1.prisma.driver.update({
            where: { id },
            data: { status },
            include: { user: { select: { name: true } } },
        });
        return res.json({ success: true, data: driver });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to update status' });
    }
};
exports.updateDriverStatus = updateDriverStatus;
const requestLeave = async (req, res) => {
    try {
        const { driverId, leaveType, startDate, endDate, reason } = req.body;
        const leave = await db_1.prisma.driverLeave.create({
            data: {
                driverId: driverId || req.user?.driverId,
                leaveType,
                startDate: new Date(startDate),
                endDate: new Date(endDate),
                reason,
                isApproved: false,
            },
        });
        return res.status(201).json({ success: true, data: leave });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to request leave' });
    }
};
exports.requestLeave = requestLeave;
const approveLeave = async (req, res) => {
    try {
        const { leaveId } = req.params;
        const { isApproved } = req.body;
        const leave = await db_1.prisma.driverLeave.update({
            where: { id: leaveId },
            data: { isApproved },
        });
        if (isApproved) {
            await db_1.prisma.driver.update({
                where: { id: leave.driverId },
                data: { status: 'ON_LEAVE' },
            });
        }
        return res.json({ success: true, data: leave });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to process leave' });
    }
};
exports.approveLeave = approveLeave;
