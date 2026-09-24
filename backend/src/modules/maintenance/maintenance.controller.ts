import { Request, Response } from 'express';
import { prisma } from '../../config/db';

export const createMaintenanceLog = async (req: Request, res: Response) => {
  try {
    const { vehicleId, type, description, cost, odometerAt, scheduledAt, setInMaintenance = true } = req.body;

    const log = await prisma.maintenanceLog.create({
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
      await prisma.vehicle.update({
        where: { id: vehicleId },
        data: { status: 'IN_MAINTENANCE' },
      });
    }

    return res.status(201).json({ success: true, data: log });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to create maintenance log' });
  }
};

export const getMaintenanceLogs = async (req: Request, res: Response) => {
  try {
    const { vehicleId, isCompleted } = req.query;

    const where: any = {};
    if (vehicleId) where.vehicleId = String(vehicleId);
    if (isCompleted !== undefined) where.isCompleted = isCompleted === 'true';

    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: { vehicle: true },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch maintenance logs' });
  }
};

export const completeMaintenance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cost, notes } = req.body;

    const log = await prisma.maintenanceLog.update({
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
    await prisma.vehicle.update({
      where: { id: log.vehicleId },
      data: { status: 'AVAILABLE' },
    });

    return res.json({ success: true, message: 'Maintenance completed and vehicle restored to available', data: log });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to complete maintenance' });
  }
};
