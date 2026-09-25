import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../config/db';
import { generateToken } from '../../utils/jwt';

export const login = async (req: Request, res: Response) => {
  try {
    const { identifier, email, password } = req.body;
    const loginId = identifier || email; // support both field names

    if (!loginId || !password) {
      return res.status(400).json({ success: false, message: 'Identifier and password are required' });
    }

    // Try finding by employeeId first, then fall back to email
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { employeeId: loginId },
          { email: loginId },
        ],
      },
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

// GET /auth/lookup-employee?employeeId=EMP-104
// Returns public employee info — used for passenger search in trip request
export const lookupEmployee = async (req: Request, res: Response) => {
  try {
    const { employeeId } = req.query;

    if (!employeeId || typeof employeeId !== 'string') {
      return res.status(400).json({ success: false, message: 'employeeId query param required' });
    }

    const user = await prisma.user.findFirst({
      where: {
        employeeId: employeeId.toUpperCase(),
        role: 'EMPLOYEE',
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        email: true,
        employeeId: true,
        department: true,
        phone: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'No employee found with that ID' });
    }

    return res.json({ success: true, data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Lookup failed' });
  }
};

// POST /auth/users — Admin creates an employee or driver with credentials
export const createUser = async (req: Request, res: Response) => {
  try {
    const {
      name,
      email,
      password = 'password123',
      role = 'EMPLOYEE',
      department,
      employeeId,
      phone,
      licenseNumber,
      licenseExpiry,
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists' });
    }

    // Auto-generate employeeId if not provided
    let finalEmployeeId = employeeId ? employeeId.trim().toUpperCase() : null;
    if (!finalEmployeeId) {
      if (role === 'DRIVER') {
        // Find the highest existing DRV-NNN number and increment from there
        const existingDriverIds = await prisma.user.findMany({
          where: { role: 'DRIVER', employeeId: { startsWith: 'DRV-' } },
          select: { employeeId: true },
        });
        const maxNum = existingDriverIds.reduce((max, u) => {
          const num = parseInt((u.employeeId || '').replace('DRV-', ''), 10);
          return isNaN(num) ? max : Math.max(max, num);
        }, 0);

        // Find a free slot (collision-safe loop)
        let candidate = maxNum + 1;
        let safe = false;
        while (!safe && candidate < 10000) {
          const candidateId = `DRV-${String(candidate).padStart(3, '0')}`;
          const exists = await prisma.user.findFirst({ where: { employeeId: candidateId } });
          if (!exists) { finalEmployeeId = candidateId; safe = true; }
          else candidate++;
        }
        if (!safe) {
          return res.status(500).json({ success: false, message: 'Could not generate a unique driver ID' });
        }
      } else {
        // Find the highest existing EMP-NNN number and increment from there
        const existingEmpIds = await prisma.user.findMany({
          where: { role: 'EMPLOYEE', employeeId: { startsWith: 'EMP-' } },
          select: { employeeId: true },
        });
        const maxNum = existingEmpIds.reduce((max, u) => {
          const num = parseInt((u.employeeId || '').replace('EMP-', ''), 10);
          return isNaN(num) ? max : Math.max(max, num);
        }, 100);

        // Find a free slot (collision-safe loop)
        let candidate = maxNum + 1;
        let safe = false;
        while (!safe && candidate < 100000) {
          const candidateId = `EMP-${candidate}`;
          const exists = await prisma.user.findFirst({ where: { employeeId: candidateId } });
          if (!exists) { finalEmployeeId = candidateId; safe = true; }
          else candidate++;
        }
        if (!safe) {
          return res.status(500).json({ success: false, message: 'Could not generate a unique employee ID' });
        }
      }
    } else {
      // Manual ID provided — check it's not already taken
      const existingId = await prisma.user.findFirst({ where: { employeeId: finalEmployeeId } });
      if (existingId) {
        return res.status(400).json({ success: false, message: `Employee ID ${finalEmployeeId} is already assigned to another user` });
      }
    }

    // Organization fallback
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
        phone: phone || null,
        passwordHash,
        role: role as any,
        department: department || (role === 'DRIVER' ? 'Logistics / Fleet' : 'General'),
        employeeId: finalEmployeeId,
        organizationId: org.id,
        driverProfile:
          role === 'DRIVER'
            ? {
                create: {
                  licenseNumber: licenseNumber || `LIC-${Math.floor(100000 + Math.random() * 900000)}`,
                  licenseExpiry: licenseExpiry
                    ? new Date(licenseExpiry)
                    : new Date(Date.now() + 365 * 24 * 3600 * 1000 * 3), // 3 years default
                },
              }
            : undefined,
      },
      include: {
        driverProfile: true,
        organization: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: `${role} account created successfully`,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        employeeId: user.employeeId,
        role: user.role,
        department: user.department,
        phone: user.phone,
        driverId: user.driverProfile?.id,
        driverStatus: user.driverProfile?.status,
        licenseNumber: user.driverProfile?.licenseNumber,
      },
    });
  } catch (error: any) {
    console.error('Create user error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create user' });
  }
};

// GET /auth/users — Admin lists users (filterable by role, search)
export const listUsers = async (req: Request, res: Response) => {
  try {
    const { role, search } = req.query;

    const where: any = { isActive: true };
    if (role && (role === 'EMPLOYEE' || role === 'DRIVER' || role === 'ADMIN')) {
      where.role = role;
    }

    if (search && typeof search === 'string') {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { employeeId: { contains: search, mode: 'insensitive' } },
        { department: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        employeeId: true,
        department: true,
        createdAt: true,
        driverProfile: {
          select: {
            id: true,
            licenseNumber: true,
            licenseExpiry: true,
            status: true,
          },
        },
        _count: {
          select: {
            tripRequests: true,
            sentMessages: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: users });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to list users' });
  }
};

// DELETE /auth/users/:id — Admin permanently deletes a user (hard delete with cascade)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const requesterId = req.user?.userId;

    const user = await prisma.user.findUnique({
      where: { id },
      include: { driverProfile: { select: { id: true } } },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.role === 'ADMIN') {
      return res.status(400).json({ success: false, message: 'Admin accounts cannot be deleted' });
    }

    // Prevent self-deletion
    if (requesterId && user.id === requesterId) {
      return res.status(400).json({ success: false, message: 'You cannot delete your own account' });
    }

    // Check if driver is currently on an active trip
    if (user.driverProfile) {
      const activeTrip = await prisma.trip.findFirst({
        where: {
          driverId: user.driverProfile.id,
          status: { in: ['APPROVED', 'IN_PROGRESS'] },
        },
      });
      if (activeTrip) {
        return res.status(400).json({
          success: false,
          message: 'Cannot delete a driver who is currently assigned to an active trip. Complete or reassign the trip first.',
        });
      }
    }

    // Check if employee has pending or active trip requests
    const activeRequestedTrip = await prisma.trip.findFirst({
      where: {
        requesterId: user.id,
        status: { in: ['PENDING', 'APPROVED', 'IN_PROGRESS'] },
      },
    });
    if (activeRequestedTrip) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an employee with pending or active trip requests. Cancel or resolve them first.',
      });
    }

    // Perform safe cascading delete inside a transaction
    await prisma.$transaction(async (tx) => {
      // 1. Delete all chat messages sent by this user (avoids foreign key constraint)
      await tx.chatMessage.deleteMany({ where: { senderId: id } });

      // 2. Unassign driver from any historical trips so driver can be deleted cleanly
      if (user.driverProfile) {
        await tx.trip.updateMany({
          where: { driverId: user.driverProfile.id },
          data: { driverId: null },
        });
      }

      // 3. For any completed/cancelled trips requested by this user, reassign requester to admin (or cleanup)
      if (requesterId) {
        await tx.trip.updateMany({
          where: { requesterId: id },
          data: { requesterId },
        });
      } else {
        const trips = await tx.trip.findMany({ where: { requesterId: id }, select: { id: true } });
        const tripIds = trips.map((t) => t.id);
        if (tripIds.length > 0) {
          await tx.trackingPoint.deleteMany({ where: { tripId: { in: tripIds } } });
          await tx.tripPassenger.deleteMany({ where: { tripId: { in: tripIds } } });
          await tx.fuelLog.updateMany({ where: { tripId: { in: tripIds } }, data: { tripId: null } });
          const convs = await tx.conversation.findMany({ where: { tripId: { in: tripIds } }, select: { id: true } });
          const convIds = convs.map((c) => c.id);
          if (convIds.length > 0) {
            await tx.chatMessage.deleteMany({ where: { conversationId: { in: convIds } } });
            await tx.convParticipant.deleteMany({ where: { conversationId: { in: convIds } } });
            await tx.conversation.deleteMany({ where: { id: { in: convIds } } });
          }
          await tx.trip.deleteMany({ where: { id: { in: tripIds } } });
        }
      }

      // 4. Delete the user (Prisma cascade will delete DriverProfile, Notifications, ConvParticipant)
      await tx.user.delete({ where: { id } });
    });

    return res.json({
      success: true,
      message: `${user.name} (${user.employeeId || user.email}) has been permanently deleted`,
    });
  } catch (error: any) {
    console.error('Delete user error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to delete user' });
  }
};

