import { Request, Response } from 'express';
import { prisma } from '../../config/db';
import { checkFuelAnomaly } from '../../utils/helpers';

export const logFuel = async (req: Request, res: Response) => {
  try {
    const {
      vehicleId,
      driverId,
      tripId,
      odometerReading,
      fuelAdded,
      pricePerLiter,
      receiptPhoto,
      stationName,
      notes,
    } = req.body;

    const actualDriverId = driverId || req.user?.driverId;
    if (!vehicleId || !actualDriverId || !odometerReading || !fuelAdded || !pricePerLiter) {
      return res.status(400).json({
        success: false,
        message: 'Vehicle, driver, odometer, fuel amount, and price are required',
      });
    }

    const odo = parseFloat(odometerReading);
    const liters = parseFloat(fuelAdded);
    const unitPrice = parseFloat(pricePerLiter);
    const totalCost = Math.round(liters * unitPrice * 100) / 100;

    // Fetch vehicle for rated efficiency
    const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });

    // Fetch previous fuel log to compute delta distance
    const prevLog = await prisma.fuelLog.findFirst({
      where: { vehicleId },
      orderBy: { loggedAt: 'desc' },
    });

    const deltaKm = prevLog ? odo - prevLog.odometerReading : 0;

    const { isAnomaly, actualRate, deviationPct } = checkFuelAnomaly(
      deltaKm > 0 ? deltaKm : 100, // fallback estimate if first log
      liters,
      vehicle.fuelEfficiency
    );

    const fuelLog = await prisma.fuelLog.create({
      data: {
        vehicleId,
        driverId: actualDriverId,
        tripId: tripId || null,
        odometerReading: odo,
        fuelAdded: liters,
        pricePerLiter: unitPrice,
        totalCost,
        receiptPhoto: receiptPhoto || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?w=800',
        stationName: stationName || 'City Central Fuel Station',
        notes: notes || (isAnomaly ? `Deviation of ${deviationPct}% detected against rated ${vehicle.fuelEfficiency} km/L` : null),
        consumptionRate: actualRate,
        isAnomaly,
      },
      include: {
        vehicle: true,
        driver: { include: { user: { select: { name: true } } } },
      },
    });

    // Also update vehicle current odometer
    if (odo > vehicle.odometer) {
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { odometer: odo },
      });
    }

    return res.status(201).json({
      success: true,
      message: isAnomaly ? 'Fuel logged with Anomaly Warning!' : 'Fuel logged successfully',
      data: fuelLog,
    });
  } catch (error: any) {
    console.error('Fuel log error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to log fuel' });
  }
};

export const getFuelLogs = async (req: Request, res: Response) => {
  try {
    const { vehicleId, driverId, isAnomaly } = req.query;

    const where: any = {};
    if (vehicleId) where.vehicleId = String(vehicleId);
    if (driverId) where.driverId = String(driverId);
    if (isAnomaly !== undefined) where.isAnomaly = isAnomaly === 'true';

    const logs = await prisma.fuelLog.findMany({
      where,
      include: {
        vehicle: true,
        driver: { include: { user: { select: { name: true, email: true } } } },
        trip: { select: { id: true, purpose: true } },
      },
      orderBy: { loggedAt: 'desc' },
    });

    return res.json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch fuel logs' });
  }
};

export const getFuelAnalytics = async (req: Request, res: Response) => {
  try {
    const logs = await prisma.fuelLog.findMany({
      include: { vehicle: true },
      orderBy: { loggedAt: 'asc' },
    });

    const totalCost = logs.reduce((sum: number, log: any) => sum + log.totalCost, 0);
    const totalLiters = logs.reduce((sum: number, log: any) => sum + log.fuelAdded, 0);
    const anomalyCount = logs.filter((log: any) => log.isAnomaly).length;

    return res.json({
      success: true,
      data: {
        totalCost: Math.round(totalCost),
        totalLiters: Math.round(totalLiters * 10) / 10,
        totalEntries: logs.length,
        anomalyCount,
        recentLogs: logs.slice(-10),
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch fuel analytics' });
  }
};
