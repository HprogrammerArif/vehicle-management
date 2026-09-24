import { Request, Response } from 'express';
import { prisma } from '../../config/db';

export const getDrivers = async (req: Request, res: Response) => {
  try {
    const { status } = req.query;
    const where: any = {};
    if (status) where.status = status;

    const drivers = await prisma.driver.findMany({
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
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch drivers' });
  }
};

export const getAvailableDrivers = async (req: Request, res: Response) => {
  try {
    const drivers = await prisma.driver.findMany({
      where: { status: 'AVAILABLE' },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    return res.json({ success: true, data: drivers });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch available drivers' });
  }
};

export const getDriverById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const driver = await prisma.driver.findUnique({
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
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch driver' });
  }
};

export const updateDriverStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const driver = await prisma.driver.update({
      where: { id },
      data: { status },
      include: { user: { select: { name: true } } },
    });

    return res.json({ success: true, data: driver });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to update status' });
  }
};

export const requestLeave = async (req: Request, res: Response) => {
  try {
    const { driverId, leaveType, startDate, endDate, reason } = req.body;

    const leave = await prisma.driverLeave.create({
      data: {
        driverId: driverId || req.user?.driverId!,
        leaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason,
        isApproved: false,
      },
    });

    return res.status(201).json({ success: true, data: leave });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to request leave' });
  }
};

export const approveLeave = async (req: Request, res: Response) => {
  try {
    const { leaveId } = req.params;
    const { isApproved } = req.body;

    const leave = await prisma.driverLeave.update({
      where: { id: leaveId },
      data: { isApproved },
    });

    if (isApproved) {
      await prisma.driver.update({
        where: { id: leave.driverId },
        data: { status: 'ON_LEAVE' },
      });
    }

    return res.json({ success: true, data: leave });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to process leave' });
  }
};
