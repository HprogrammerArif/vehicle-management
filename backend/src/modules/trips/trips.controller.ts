import { Request, Response } from 'express';
import { prisma } from '../../config/db';

export const createTrip = async (req: Request, res: Response) => {
  try {
    const {
      fromOfficeId,
      toOfficeId,
      departureAt,
      returnAt,
      purpose,
      tripType = 'ONE_WAY',
      passengers = [],
    } = req.body;

    const requesterId = req.user?.userId;
    if (!requesterId) return res.status(401).json({ success: false, message: 'Unauthenticated' });

    if (!fromOfficeId || !toOfficeId || !departureAt || !purpose) {
      return res.status(400).json({
        success: false,
        message: 'From Office, To Office, Departure Date/Time, and Purpose are required',
      });
    }

    const trip = await prisma.trip.create({
      data: {
        requesterId,
        fromOfficeId,
        toOfficeId,
        departureAt: new Date(departureAt),
        returnAt: returnAt ? new Date(returnAt) : null,
        purpose,
        tripType,
        status: 'PENDING',
        passengers: {
          create: passengers.map((p: any) => ({
            name: p.name,
            email: p.email || null,
          })),
        },
      },
      include: {
        fromOffice: true,
        toOffice: true,
        requester: { select: { id: true, name: true, email: true } },
        passengers: true,
      },
    });

    return res.status(201).json({ success: true, data: trip });
  } catch (error: any) {
    console.error('Create trip error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to request trip' });
  }
};

export const getTrips = async (req: Request, res: Response) => {
  try {
    const { status, requesterId, driverId, vehicleId } = req.query;
    const user = req.user;

    const where: any = {};

    if (status) where.status = status;
    if (vehicleId) where.vehicleId = vehicleId;

    // RBAC: If Employee, only show their trips
    if (user?.role === 'EMPLOYEE') {
      where.requesterId = user.userId;
    } else if (user?.role === 'DRIVER') {
      where.driverId = user.driverId;
    } else {
      // Admin filters
      if (requesterId) where.requesterId = requesterId;
      if (driverId) where.driverId = driverId;
    }

    const trips = await prisma.trip.findMany({
      where,
      include: {
        requester: { select: { id: true, name: true, email: true, phone: true } },
        vehicle: true,
        driver: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
        fromOffice: true,
        toOffice: true,
        passengers: true,
        conversation: { select: { id: true, isResolved: true } },
        _count: { select: { trackingPoints: true, fuelLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ success: true, data: trips });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch trips' });
  }
};

export const getTripById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        requester: { select: { id: true, name: true, email: true, phone: true, department: true } },
        vehicle: true,
        driver: {
          include: {
            user: { select: { id: true, name: true, phone: true, email: true } },
          },
        },
        fromOffice: true,
        toOffice: true,
        passengers: true,
        conversation: { select: { id: true, isResolved: true } },
        trackingPoints: {
          orderBy: { timestamp: 'asc' },
        },
        fuelLogs: true,
      },
    });

    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found' });
    }

    return res.json({ success: true, data: trip });
  } catch (error) {
    return res.status(500).json({ success: false, message: 'Failed to fetch trip details' });
  }
};

export const approveAndAssignTrip = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { vehicleId, driverId, adminNotes } = req.body;

    if (!vehicleId || !driverId) {
      return res.status(400).json({
        success: false,
        message: 'Both Vehicle and Driver must be assigned to approve trip',
      });
    }

    // Atomic transaction: verify availability and assign
    const result = await prisma.$transaction(async (tx: any) => {
      const vehicle = await tx.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
      if (vehicle.status !== 'AVAILABLE') {
        throw new Error(`Vehicle ${vehicle.registrationNo} is not available (Current status: ${vehicle.status})`);
      }

      const driver = await tx.driver.findUniqueOrThrow({
        where: { id: driverId },
        include: { user: true },
      });
      if (driver.status !== 'AVAILABLE') {
        throw new Error(`Driver ${driver.user.name} is not available (Current status: ${driver.status})`);
      }

      // Update trip
      const updatedTrip = await tx.trip.update({
        where: { id },
        data: {
          status: 'APPROVED',
          vehicleId,
          driverId,
          adminNotes,
          startOdometer: vehicle.odometer,
        },
        include: {
          vehicle: true,
          driver: { include: { user: true } },
          fromOffice: true,
          toOffice: true,
          requester: true,
        },
      });

      // Update vehicle & driver status
      await tx.vehicle.update({ where: { id: vehicleId }, data: { status: 'IN_USE' } });
      await tx.driver.update({ where: { id: driverId }, data: { status: 'ON_TRIP' } });

      // Create notification for requester
      await tx.notification.create({
        data: {
          userId: updatedTrip.requesterId,
          title: 'Trip Approved & Assigned',
          body: `Your trip from ${updatedTrip.fromOffice.name} to ${updatedTrip.toOffice.name} is approved. Driver: ${driver.user.name}, Vehicle: ${vehicle.model} (${vehicle.registrationNo}).`,
          type: 'TRIP_UPDATE',
        },
      });

      // Create notification for driver
      await tx.notification.create({
        data: {
          userId: driver.userId,
          title: 'New Trip Assigned',
          body: `You have been assigned to trip to ${updatedTrip.toOffice.name} departing on ${new Date(updatedTrip.departureAt).toLocaleDateString()}.`,
          type: 'TRIP_UPDATE',
        },
      });

      // Automatically create a Trip-scoped real-time Chat Thread
      const adminUserId = req.user?.userId || updatedTrip.requesterId;
      const participantUserIds = Array.from(
        new Set([updatedTrip.requesterId, driver.userId, adminUserId])
      );

      await tx.conversation.upsert({
        where: { tripId: updatedTrip.id },
        update: {},
        create: {
          tripId: updatedTrip.id,
          subject: `Trip: ${updatedTrip.fromOffice.name} → ${updatedTrip.toOffice.name}`,
          type: 'TRIP_THREAD',
          participants: {
            create: participantUserIds.map((uId) => ({
              userId: uId,
              lastReadAt: uId === adminUserId ? new Date() : null,
            })),
          },
          messages: {
            create: {
              senderId: adminUserId,
              body: `✅ Trip Approved & Dispatched. Vehicle: ${vehicle.make} ${vehicle.model} (${vehicle.registrationNo}), Driver: ${driver.user.name} (${driver.user.phone || 'N/A'}). Departure scheduled for ${new Date(updatedTrip.departureAt).toLocaleString()}.`,
              messageType: 'SYSTEM_EVENT',
              isSystem: true,
            },
          },
        },
      });

      return updatedTrip;
    });

    return res.json({ success: true, message: 'Trip approved and assigned successfully', data: result });
  } catch (error: any) {
    console.error('Approve trip error:', error);
    return res.status(400).json({ success: false, message: error.message || 'Failed to approve trip' });
  }
};

export const rejectTrip = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    const trip = await prisma.trip.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: rejectionReason || 'Request could not be accommodated at this time.',
      },
    });

    await prisma.notification.create({
      data: {
        userId: trip.requesterId,
        title: 'Trip Request Rejected',
        body: `Your trip request was rejected: ${trip.rejectionReason}`,
        type: 'TRIP_UPDATE',
      },
    });

    return res.json({ success: true, message: 'Trip rejected', data: trip });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to reject trip' });
  }
};

export const startTrip = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { startOdometer } = req.body;

    const existingTrip = await prisma.trip.findUniqueOrThrow({
      where: { id },
      include: { vehicle: true },
    });

    const odo = startOdometer !== undefined ? parseFloat(startOdometer) : existingTrip.vehicle?.odometer || 0;

    const trip = await prisma.trip.update({
      where: { id },
      data: {
        status: 'IN_PROGRESS',
        startedAt: new Date(),
        startOdometer: odo,
      },
      include: {
        vehicle: true,
        driver: { include: { user: true } },
      },
    });

    return res.json({ success: true, message: 'Trip journey started', data: trip });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to start trip' });
  }
};

export const completeTrip = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { endOdometer } = req.body;

    const existingTrip = await prisma.trip.findUniqueOrThrow({
      where: { id },
      include: { vehicle: true },
    });

    const finalOdometer = parseFloat(endOdometer);
    const startOdo = existingTrip.startOdometer || existingTrip.vehicle?.odometer || finalOdometer;
    const distanceCovered = Math.max(0, Math.round((finalOdometer - startOdo) * 10) / 10);

    const result = await prisma.$transaction(async (tx: any) => {
      const updatedTrip = await tx.trip.update({
        where: { id },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          endOdometer: finalOdometer,
          distanceCovered,
        },
      });

      // Release vehicle and update odometer
      if (existingTrip.vehicleId) {
        await tx.vehicle.update({
          where: { id: existingTrip.vehicleId },
          data: {
            status: 'AVAILABLE',
            odometer: finalOdometer,
          },
        });
      }

      // Release driver
      if (existingTrip.driverId) {
        await tx.driver.update({
          where: { id: existingTrip.driverId },
          data: { status: 'AVAILABLE' },
        });
      }

      return updatedTrip;
    });

    return res.json({ success: true, message: 'Trip completed successfully', data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to complete trip' });
  }
};

export const cancelTrip = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const trip = await prisma.trip.findUniqueOrThrow({ where: { id } });

    await prisma.$transaction(async (tx: any) => {
      await tx.trip.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      if (trip.vehicleId) {
        await tx.vehicle.update({
          where: { id: trip.vehicleId },
          data: { status: 'AVAILABLE' },
        });
      }

      if (trip.driverId) {
        await tx.driver.update({
          where: { id: trip.driverId },
          data: { status: 'AVAILABLE' },
        });
      }
    });

    return res.json({ success: true, message: 'Trip cancelled' });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message || 'Failed to cancel trip' });
  }
};
