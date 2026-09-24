import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/db';
import { generateToken } from '../../utils/jwt';

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        driverProfile: true,
        organization: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account' });
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      driverId: user.driverProfile?.id,
    });

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId,
        driverId: user.driverProfile?.id,
        organization: user.organization.name,
      },
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role = 'EMPLOYEE', department, employeeId, licenseNumber, licenseExpiry } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email is already registered' });
    }

    // Default to first organization or create one
    let org = await prisma.organization.findFirst();
    if (!org) {
      org = await prisma.organization.create({
        data: { name: 'AppTriangle Corporate Fleet' },
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role as any,
        department,
        employeeId,
        organizationId: org.id,
        driverProfile:
          role === 'DRIVER'
            ? {
                create: {
                  licenseNumber: licenseNumber || `LIC-${Date.now()}`,
                  licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : new Date(Date.now() + 365 * 24 * 3600 * 1000 * 2),
                },
              }
            : undefined,
      },
      include: {
        driverProfile: true,
      },
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      driverId: user.driverProfile?.id,
    });

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        driverId: user.driverProfile?.id,
      },
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Unauthenticated' });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: {
        driverProfile: true,
        organization: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        employeeId: user.employeeId,
        driverId: user.driverProfile?.id,
        driverStatus: user.driverProfile?.status,
        organization: user.organization.name,
      },
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
};

export const updateFcmToken = async (req: Request, res: Response) => {
  try {
    const { fcmToken } = req.body;
    if (!req.user) return res.status(401).json({ success: false });

    await prisma.user.update({
      where: { id: req.user.userId },
      data: { fcmToken },
    });

    return res.json({ success: true, message: 'FCM Token updated' });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to update token' });
  }
};
