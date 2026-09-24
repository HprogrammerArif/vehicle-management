import { Request, Response } from 'express';
import { prisma } from '../../config/db';

export const getVehicles = async (req: Request, res: Response) => {
  try {
    const { status, type, search } = req.query;

    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (search) {
      where.OR = [
        { registrationNo: { contains: String(search), mode: 'insensitive' } },
        { make: { contains: String(search), mode: 'insensitive' } },
        { model: { contains: String(search), mode: 'insensitive' } },
      ];
    }

    const vehicles = await prisma.vehicle.findMany({
      where,
      include: {
        _count: {
          select: { trips: true, fuelLogs: true, maintenanceLogs: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: vehicles });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch vehicles' });
  }
};

export const getAvailableVehicles = async (req: Request, res: Response) => {
  try {
    const vehicles = await prisma.vehicle.findMany({
      where: {
        status: 'AVAILABLE',
      },
      orderBy: { model: 'asc' },
    });

    return res.json({ success: true, data: vehicles });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch available vehicles' });
  }
};

export const getVehicleById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: {
        trips: {
          take: 5,
          orderBy: { departureAt: 'desc' },
          include: { requester: { select: { name: true } }, driver: { include: { user: { select: { name: true } } } } },
        },
        fuelLogs: {
          take: 5,
          orderBy: { loggedAt: 'desc' },
        },
        maintenanceLogs: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    return res.json({ success: true, data: vehicle });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch vehicle' });
  }
};

export const createVehicle = async (req: Request, res: Response) => {
  try {
    const { registrationNo, make, model, year, type, capacity, fuelType, fuelEfficiency, odometer, photo } = req.body;

    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({ data: { name: 'AppTriangle Corporate Fleet' } });
    }

    const vehicle = await prisma.vehicle.create({
      data: {
        registrationNo,
        make,
        model,
        year: parseInt(year, 10),
        type,
        capacity: parseInt(capacity, 10),
        fuelType,
        fuelEfficiency: parseFloat(fuelEfficiency),
        odometer: odometer ? parseFloat(odometer) : 0,
        photo,
        organizationId: org.id,
      },
    });

    return res.status(201).json({ success: true, data: vehicle });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to create vehicle' });
  }
};

export const updateVehicle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, odometer, photo, fuelEfficiency, make, model, type, capacity } = req.body;

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(odometer !== undefined && { odometer: parseFloat(odometer) }),
        ...(photo && { photo }),
        ...(fuelEfficiency && { fuelEfficiency: parseFloat(fuelEfficiency) }),
        ...(make && { make }),
        ...(model && { model }),
        ...(type && { type }),
        ...(capacity && { capacity: parseInt(capacity, 10) }),
      },
    });

    return res.json({ success: true, data: vehicle });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to update vehicle' });
  }
};

export const deleteVehicle = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.vehicle.delete({ where: { id } });
    return res.json({ success: true, message: 'Vehicle deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to delete vehicle' });
  }
};
