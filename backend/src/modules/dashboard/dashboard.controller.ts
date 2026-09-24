import { Request, Response } from 'express';
import { prisma } from '../../config/db';

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    const [
      totalVehicles,
      availableVehicles,
      inUseVehicles,
      inMaintenanceVehicles,
      totalDrivers,
      availableDrivers,
      onTripDrivers,
      onLeaveDrivers,
      pendingTrips,
      activeTrips,
      completedTrips,
      fuelLogs,
      recentTrips,
      fuelAnomalies,
    ] = await Promise.all([
      prisma.vehicle.count(),
      prisma.vehicle.count({ where: { status: 'AVAILABLE' } }),
      prisma.vehicle.count({ where: { status: 'IN_USE' } }),
      prisma.vehicle.count({ where: { status: 'IN_MAINTENANCE' } }),
      prisma.driver.count(),
      prisma.driver.count({ where: { status: 'AVAILABLE' } }),
      prisma.driver.count({ where: { status: 'ON_TRIP' } }),
      prisma.driver.count({ where: { status: 'ON_LEAVE' } }),
      prisma.trip.count({ where: { status: 'PENDING' } }),
      prisma.trip.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.trip.count({ where: { status: 'COMPLETED' } }),
      prisma.fuelLog.findMany({ select: { totalCost: true, fuelAdded: true } }),
      prisma.trip.findMany({
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
      prisma.fuelLog.findMany({
        where: { isAnomaly: true },
        take: 5,
        orderBy: { loggedAt: 'desc' },
        include: {
          vehicle: { select: { model: true, registrationNo: true } },
          driver: { include: { user: { select: { name: true } } } },
        },
      }),
    ]);

    const totalFuelCost = fuelLogs.reduce((acc: number, log: { totalCost: number; fuelAdded: number }) => acc + log.totalCost, 0);
    const totalFuelLiters = fuelLogs.reduce((acc: number, log: { totalCost: number; fuelAdded: number }) => acc + log.fuelAdded, 0);

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
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
  }
};
