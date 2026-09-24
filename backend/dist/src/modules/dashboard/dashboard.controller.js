"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDashboardStats = void 0;
const db_1 = require("../../config/db");
const getDashboardStats = async (req, res) => {
    try {
        const [totalVehicles, availableVehicles, inUseVehicles, inMaintenanceVehicles, totalDrivers, availableDrivers, onTripDrivers, onLeaveDrivers, pendingTrips, activeTrips, completedTrips, fuelLogs, recentTrips, fuelAnomalies,] = await Promise.all([
            db_1.prisma.vehicle.count(),
            db_1.prisma.vehicle.count({ where: { status: 'AVAILABLE' } }),
            db_1.prisma.vehicle.count({ where: { status: 'IN_USE' } }),
            db_1.prisma.vehicle.count({ where: { status: 'IN_MAINTENANCE' } }),
            db_1.prisma.driver.count(),
            db_1.prisma.driver.count({ where: { status: 'AVAILABLE' } }),
            db_1.prisma.driver.count({ where: { status: 'ON_TRIP' } }),
            db_1.prisma.driver.count({ where: { status: 'ON_LEAVE' } }),
            db_1.prisma.trip.count({ where: { status: 'PENDING' } }),
            db_1.prisma.trip.count({ where: { status: 'IN_PROGRESS' } }),
            db_1.prisma.trip.count({ where: { status: 'COMPLETED' } }),
            db_1.prisma.fuelLog.findMany({ select: { totalCost: true, fuelAdded: true } }),
            db_1.prisma.trip.findMany({
                take: 6,
                orderBy: { createdAt: 'desc' },
                include: {
                    requester: { select: { name: true, email: true } },
                    vehicle: { select: { model: true, registrationNo: true } },
                    driver: { include: { user: { select: { name: true } } } },
                    fromOffice: { select: { name: true } },
                    toOffice: { select: { name: true } },
                },
            }),
            db_1.prisma.fuelLog.findMany({
                where: { isAnomaly: true },
                take: 5,
                orderBy: { loggedAt: 'desc' },
                include: {
                    vehicle: { select: { model: true, registrationNo: true } },
                    driver: { include: { user: { select: { name: true } } } },
                },
            }),
        ]);
        const totalFuelCost = fuelLogs.reduce((acc, log) => acc + log.totalCost, 0);
        const totalFuelLiters = fuelLogs.reduce((acc, log) => acc + log.fuelAdded, 0);
        return res.json({
            success: true,
            data: {
                vehicles: {
                    total: totalVehicles,
                    available: availableVehicles,
                    inUse: inUseVehicles,
                    inMaintenance: inMaintenanceVehicles,
                },
                drivers: {
                    total: totalDrivers,
                    available: availableDrivers,
                    onTrip: onTripDrivers,
                    onLeave: onLeaveDrivers,
                },
                trips: {
                    pending: pendingTrips,
                    active: activeTrips,
                    completed: completedTrips,
                    total: pendingTrips + activeTrips + completedTrips,
                },
                fuel: {
                    totalCost: Math.round(totalFuelCost),
                    totalLiters: Math.round(totalFuelLiters),
                    anomalyCount: fuelAnomalies.length,
                },
                recentTrips,
                recentAnomalies: fuelAnomalies,
            },
        });
    }
    catch (error) {
        console.error('Dashboard stats error:', error);
        return res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
    }
};
exports.getDashboardStats = getDashboardStats;
