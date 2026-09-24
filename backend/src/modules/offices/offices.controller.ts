import { Request, Response } from 'express';
import { prisma } from '../../config/db';

export const getOffices = async (req: Request, res: Response) => {
  try {
    const offices = await prisma.office.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json({ success: true, data: offices });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch offices' });
  }
};

export const createOffice = async (req: Request, res: Response) => {
  try {
    const { name, type, address, latitude, longitude } = req.body;

    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: { name: 'AppTriangle Corporate Fleet' },
      });
    }

    const office = await prisma.office.create({
      data: {
        name,
        type: type || 'BRANCH',
        address,
        latitude: latitude ? parseFloat(latitude) : null,
        longitude: longitude ? parseFloat(longitude) : null,
        organizationId: org.id,
      },
    });

    return res.status(201).json({ success: true, data: office });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to create office' });
  }
};
