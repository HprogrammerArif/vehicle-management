"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.completeMaintenance = exports.getMaintenanceLogs = exports.createMaintenanceLog = void 0;
const db_1 = require("../../config/db");
const createMaintenanceLog = async (req, res) => {
    try {
        const { vehicleId, type, description, cost, odometerAt, scheduledAt, setInMaintenance = true } = req.body;
        const log = await db_1.prisma.maintenanceLog.create({
            data: {
                vehicleId,
                type: type || 'SCHEDULED',
                description,
                cost: cost ? parseFloat(cost) : null,
                odometerAt: odometerAt ? parseFloat(odometerAt) : null,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
                isCompleted: false,
            },
            include: { vehicle: true },
        });
        if (setInMaintenance) {
            await db_1.prisma.vehicle.update({
                where: { id: vehicleId },
                data: { status: 'IN_MAINTENANCE' },
            });
        }
        return res.status(201).json({ success: true, data: log });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to create maintenance log' });
    }
};
exports.createMaintenanceLog = createMaintenanceLog;
const getMaintenanceLogs = async (req, res) => {
    try {
        const { vehicleId, isCompleted } = req.query;
        const where = {};
        if (vehicleId)
            where.vehicleId = String(vehicleId);
        if (isCompleted !== undefined)
            where.isCompleted = isCompleted === 'true';
        const logs = await db_1.prisma.maintenanceLog.findMany({
            where,
            include: { vehicle: true },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ success: true, data: logs });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch maintenance logs' });
    }
};
exports.getMaintenanceLogs = getMaintenanceLogs;
const completeMaintenance = async (req, res) => {
    try {
        const { id } = req.params;
        const { cost, notes } = req.body;
        const log = await db_1.prisma.maintenanceLog.update({
            where: { id },
            data: {
                isCompleted: true,
                completedAt: new Date(),
                ...(cost && { cost: parseFloat(cost) }),
                ...(notes && { notes }),
            },
            include: { vehicle: true },
        });
        // Restore vehicle to AVAILABLE
        await db_1.prisma.vehicle.update({
            where: { id: log.vehicleId },
            data: { status: 'AVAILABLE' },
        });
        return res.json({ success: true, message: 'Maintenance completed and vehicle restored to available', data: log });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to complete maintenance' });
    }
};
exports.completeMaintenance = completeMaintenance;
