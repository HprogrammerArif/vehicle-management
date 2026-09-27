"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelTrip = exports.completeTrip = exports.startTrip = exports.rejectTrip = exports.approveAndAssignTrip = exports.getTripById = exports.getMyTrips = exports.getTrips = exports.createTrip = void 0;
const db_1 = require("../../config/db");
const notifications_controller_1 = require("../notifications/notifications.controller");
const createTrip = async (req, res) => {
    try {
        const { fromOfficeId, toOfficeId, pickupAddress, dropoffAddress, departureAt, returnAt, purpose, tripType = 'ONE_WAY', passengers = [], } = req.body;
        const requesterId = req.user?.userId;
        if (!requesterId)
            return res.status(401).json({ success: false, message: 'Unauthenticated' });
        // Must have either office or custom address for both pickup and dropoff
        const hasPickup = fromOfficeId || pickupAddress;
        const hasDropoff = toOfficeId || dropoffAddress;
        if (!hasPickup || !hasDropoff || !departureAt || !purpose) {
            return res.status(400).json({
                success: false,
                message: 'Pickup location, dropoff location, departure time, and purpose are required',
            });
        }
        const trip = await db_1.prisma.trip.create({
            data: {
                requesterId,
                fromOfficeId: fromOfficeId || null,
                toOfficeId: toOfficeId || null,
                pickupAddress: pickupAddress || null,
                dropoffAddress: dropoffAddress || null,
                departureAt: new Date(departureAt),
                returnAt: returnAt ? new Date(returnAt) : null,
                purpose,
                tripType,
                status: 'PENDING',
                passengers: {
                    create: passengers.map((p) => ({
                        userId: p.userId || null,
                        employeeId: p.employeeId || null,
                        name: p.name,
                        email: p.email || null,
                        department: p.department || null,
                        phone: p.phone || null,
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
        // Notify all active administrators of the new requisition
        try {
            const admins = await db_1.prisma.user.findMany({
                where: { role: 'ADMIN', isActive: true },
                select: { id: true },
            });
            if (admins.length > 0) {
                const fromName = trip.fromOffice?.name || trip.pickupAddress || 'Origin';
                const toName = trip.toOffice?.name || trip.dropoffAddress || 'Destination';
                await db_1.prisma.notification.createMany({
                    data: admins.map((a) => ({
                        userId: a.id,
                        title: 'New Trip Requisition',
                        body: `${trip.requester.name} requested transit: ${fromName} → ${toName}`,
                        type: 'TRIP_UPDATE',
                    })),
                });
                (0, notifications_controller_1.emitNotification)({
                    userIds: admins.map((a) => a.id),
                    title: 'New Trip Requisition',
                    body: `${trip.requester.name} requested transit: ${fromName} → ${toName}`,
                    type: 'TRIP_UPDATE',
                    data: { tripId: trip.id },
                });
            }
        }
        catch (notifErr) {
            console.warn('Failed to dispatch new trip admin notification:', notifErr);
        }
        return res.status(201).json({ success: true, data: trip });
    }
    catch (error) {
        console.error('Create trip error:', error);
        return res.status(500).json({ success: false, message: error.message || 'Failed to request trip' });
    }
};
exports.createTrip = createTrip;
const getTrips = async (req, res) => {
    try {
        const { status, requesterId, driverId, vehicleId } = req.query;
        const user = req.user;
        const where = {};
        if (status)
            where.status = status;
        if (vehicleId)
            where.vehicleId = vehicleId;
        // RBAC: If Employee, only show their trips
        if (user?.role === 'EMPLOYEE') {
            where.requesterId = user.userId;
        }
        else if (user?.role === 'DRIVER') {
            where.driverId = user.driverId;
        }
        else {
            // Admin filters
            if (requesterId)
                where.requesterId = requesterId;
            if (driverId)
                where.driverId = driverId;
        }
        const trips = await db_1.prisma.trip.findMany({
            where,
            include: {
                requester: { select: { id: true, name: true, email: true, phone: true } },
                vehicle: true,
                driver: {
                    include: {
                        user: { select: { id: true, name: true, phone: true, email: true, employeeId: true } },
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch trips' });
    }
};
exports.getTrips = getTrips;
const getMyTrips = async (req, res) => {
    try {
        const user = req.user;
        if (!user)
            return res.status(401).json({ success: false, message: 'Unauthenticated' });
        const where = user.role === 'DRIVER'
            ? { driverId: user.driverId }
            : { requesterId: user.userId };
        const trips = await db_1.prisma.trip.findMany({
            where,
            include: {
                vehicle: { select: { id: true, registrationNo: true, make: true, model: true, type: true } },
                driver: {
                    include: { user: { select: { id: true, name: true, phone: true, employeeId: true } } },
                },
                fromOffice: { select: { id: true, name: true, address: true } },
                toOffice: { select: { id: true, name: true, address: true } },
                passengers: true,
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ success: true, data: trips });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch your trips' });
    }
};
exports.getMyTrips = getMyTrips;
const getTripById = async (req, res) => {
    try {
        const { id } = req.params;
        const trip = await db_1.prisma.trip.findUnique({
            where: { id },
            include: {
                requester: { select: { id: true, name: true, email: true, phone: true, department: true } },
                vehicle: true,
                driver: {
                    include: {
                        user: { select: { id: true, name: true, phone: true, email: true, employeeId: true } },
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch trip details' });
    }
};
exports.getTripById = getTripById;
const approveAndAssignTrip = async (req, res) => {
    try {
        const { id } = req.params;
        const { vehicleId, driverId, adminNotes } = req.body;
        if (!vehicleId || !driverId) {
            return res.status(400).json({
                success: false,
                message: 'Both Vehicle and Driver must be assigned to approve trip',
            });
        }
        // ---- Phase 1: Fast core transaction (availability check + atomic assignment) ----
        // Keep minimal DB ops inside the transaction to stay well within the 5s timeout.
        const result = await db_1.prisma.$transaction(async (tx) => {
            const vehicle = await tx.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
            if (vehicle.status !== 'AVAILABLE') {
                throw new Error(`Vehicle ${vehicle.registrationNo} is not available (Current status: ${vehicle.status})`);
            }
            const driver = await tx.driver.findUniqueOrThrow({
                where: { id: driverId },
                include: { user: { select: { id: true, name: true, phone: true } } },
            });
            if (driver.status !== 'AVAILABLE') {
                throw new Error(`Driver ${driver.user.name} is not available (Current status: ${driver.status})`);
            }
            // Update trip status and assignment atomically
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
                    driver: { include: { user: { select: { id: true, name: true, phone: true } } } },
                    fromOffice: { select: { id: true, name: true } },
                    toOffice: { select: { id: true, name: true } },
                    requester: { select: { id: true, name: true } },
                    passengers: { select: { id: true, userId: true, name: true } },
                },
            });
            // Flip vehicle & driver statuses
            await tx.vehicle.update({ where: { id: vehicleId }, data: { status: 'IN_USE' } });
            await tx.driver.update({ where: { id: driverId }, data: { status: 'ON_TRIP' } });
            return { updatedTrip, vehicle, driver };
        }, { timeout: 30000 } // 30 seconds — give the DB time even under load
        );
        const { updatedTrip, vehicle, driver } = result;
        const fromName = updatedTrip.fromOffice?.name || updatedTrip.pickupAddress || 'Origin';
        const toName = updatedTrip.toOffice?.name || updatedTrip.dropoffAddress || 'Destination';
        const adminUserId = req.user?.userId || updatedTrip.requesterId;
        const departureStr = new Date(updatedTrip.departureAt).toLocaleString();
        // ---- Phase 2: Post-transaction non-atomic writes (notifications + chat thread) ----
        // These run outside the transaction so a slow notification write can never time it out.
        try {
            // Notifications for requester and driver
            await db_1.prisma.notification.createMany({
                data: [
                    {
                        userId: updatedTrip.requesterId,
                        title: 'Trip Approved & Assigned',
                        body: `Your trip from ${fromName} to ${toName} is approved. Driver: ${driver.user.name}, Vehicle: ${vehicle.model} (${vehicle.registrationNo}).`,
                        type: 'TRIP_APPROVED',
                    },
                    {
                        userId: driver.userId,
                        title: 'New Trip Assigned',
                        body: `You have been assigned to trip to ${toName} departing on ${departureStr}.`,
                        type: 'TRIP_ASSIGNED',
                    },
                ],
                skipDuplicates: true,
            });
            // Passenger notifications
            const participantUserIds = Array.from(new Set([updatedTrip.requesterId, driver.userId, adminUserId]));
            if (updatedTrip.passengers && updatedTrip.passengers.length > 0) {
                const passengerNotifs = [];
                for (const p of updatedTrip.passengers) {
                    if (p.userId) {
                        participantUserIds.push(p.userId);
                        passengerNotifs.push({
                            userId: p.userId,
                            title: 'Assigned to Trip',
                            body: `You are scheduled as an accompanying colleague on trip to ${toName}. Driver: ${driver.user.name}, Vehicle: ${vehicle.model} (${vehicle.registrationNo}).`,
                            type: 'TRIP_ASSIGNED',
                        });
                    }
                }
                if (passengerNotifs.length > 0) {
                    await db_1.prisma.notification.createMany({ data: passengerNotifs, skipDuplicates: true });
                }
            }
            // Create or update the trip-scoped chat thread
            await db_1.prisma.conversation.upsert({
                where: { tripId: updatedTrip.id },
                update: {},
                create: {
                    tripId: updatedTrip.id,
                    subject: `Trip: ${fromName} → ${toName}`,
                    type: 'TRIP_THREAD',
                    participants: {
                        create: Array.from(new Set(participantUserIds)).map((uId) => ({
                            userId: uId,
                            lastReadAt: uId === adminUserId ? new Date() : null,
                        })),
                    },
                    messages: {
                        create: {
                            senderId: adminUserId,
                            body: `Trip Approved & Dispatched. Vehicle: ${vehicle.make} ${vehicle.model} (${vehicle.registrationNo}), Driver: ${driver.user.name} (${driver.user.phone || 'N/A'}). Departure scheduled for ${departureStr}.`,
                            messageType: 'SYSTEM_EVENT',
                            isSystem: true,
                        },
                    },
                },
            });
        }
        catch (postTxErr) {
            // Don't fail the entire request if post-transaction writes fail
            console.warn('Post-transaction notification/chat error (non-fatal):', postTxErr);
        }
        // ---- Phase 3: Real-time socket broadcasts ----
        try {
            (0, notifications_controller_1.emitNotification)({
                userIds: [updatedTrip.requesterId],
                title: 'Trip Approved & Assigned',
                body: `Your trip to ${toName} is approved.`,
                type: 'TRIP_APPROVED',
                data: { tripId: updatedTrip.id },
            });
            if (updatedTrip.driver?.userId) {
                (0, notifications_controller_1.emitNotification)({
                    userIds: [updatedTrip.driver.userId],
                    title: 'New Trip Assigned',
                    body: `You have been assigned to trip to ${toName}.`,
                    type: 'TRIP_ASSIGNED',
                    data: { tripId: updatedTrip.id },
                });
            }
            if (updatedTrip.passengers && updatedTrip.passengers.length > 0) {
                const passengerUserIds = updatedTrip.passengers.map((p) => p.userId).filter(Boolean);
                if (passengerUserIds.length > 0) {
                    (0, notifications_controller_1.emitNotification)({
                        userIds: passengerUserIds,
                        title: 'Assigned to Trip',
                        body: `You are scheduled on trip to ${toName}.`,
                        type: 'TRIP_ASSIGNED',
                        data: { tripId: updatedTrip.id },
                    });
                }
            }
        }
        catch (notifErr) {
            console.warn('Socket notification error on trip approval:', notifErr);
        }
        return res.json({ success: true, message: 'Trip approved and assigned successfully', data: updatedTrip });
    }
    catch (error) {
        console.error('Approve trip error:', error);
        return res.status(400).json({ success: false, message: error.message || 'Failed to approve trip' });
    }
};
exports.approveAndAssignTrip = approveAndAssignTrip;
const rejectTrip = async (req, res) => {
    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;
        const existingTrip = await db_1.prisma.trip.findUniqueOrThrow({
            where: { id },
            include: { fromOffice: true, toOffice: true, passengers: true },
        });
        const trip = await db_1.prisma.trip.update({
            where: { id },
            data: {
                status: 'REJECTED',
                rejectionReason: rejectionReason || 'Request could not be accommodated at this time.',
            },
        });
        const toLoc = existingTrip.toOffice?.name || existingTrip.dropoffAddress || 'Destination';
        await db_1.prisma.notification.create({
            data: {
                userId: trip.requesterId,
                title: 'Trip Request Rejected',
                body: `Your trip request to ${toLoc} was rejected: ${trip.rejectionReason}`,
                type: 'TRIP_REJECTED',
            },
        });
        // Notify accompanying colleagues if registered users
        for (const p of existingTrip.passengers) {
            if (p.userId) {
                await db_1.prisma.notification.create({
                    data: {
                        userId: p.userId,
                        title: 'Trip Request Rejected',
                        body: `Trip to ${toLoc} you were accompanying was rejected: ${trip.rejectionReason}`,
                        type: 'TRIP_REJECTED',
                    },
                });
            }
        }
        try {
            const recipientIds = [trip.requesterId, ...existingTrip.passengers.map((p) => p.userId).filter(Boolean)];
            (0, notifications_controller_1.emitNotification)({
                userIds: recipientIds,
                title: 'Trip Request Rejected',
                body: `Your trip request to ${toLoc} was rejected: ${trip.rejectionReason}`,
                type: 'TRIP_REJECTED',
                data: { tripId: trip.id },
            });
        }
        catch (notifErr) {
            console.warn('Socket notification error on trip rejection:', notifErr);
        }
        return res.json({ success: true, message: 'Trip rejected', data: trip });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to reject trip' });
    }
};
exports.rejectTrip = rejectTrip;
const startTrip = async (req, res) => {
    try {
        const { id } = req.params;
        const { startOdometer } = req.body;
        const existingTrip = await db_1.prisma.trip.findUniqueOrThrow({
            where: { id },
            include: {
                vehicle: true,
                driver: { include: { user: true } },
                fromOffice: true,
                toOffice: true,
                passengers: true,
            },
        });
        const odo = startOdometer !== undefined ? parseFloat(startOdometer) : existingTrip.vehicle?.odometer || 0;
        const trip = await db_1.prisma.trip.update({
            where: { id },
            data: {
                status: 'IN_PROGRESS',
                startedAt: new Date(),
                startOdometer: odo,
            },
            include: {
                vehicle: true,
                driver: { include: { user: true } },
                fromOffice: true,
                toOffice: true,
                passengers: true,
            },
        });
        const fromLoc = trip.fromOffice?.name || trip.pickupAddress || 'Origin';
        const toLoc = trip.toOffice?.name || trip.dropoffAddress || 'Destination';
        // Notify requester
        await db_1.prisma.notification.create({
            data: {
                userId: trip.requesterId,
                title: 'Trip Started',
                body: `Driver ${trip.driver?.user?.name || 'Assigned Driver'} has commenced your trip: ${fromLoc} → ${toLoc}.`,
                type: 'TRIP_STARTED',
            },
        });
        // Notify accompanying colleagues
        for (const p of trip.passengers) {
            if (p.userId) {
                await db_1.prisma.notification.create({
                    data: {
                        userId: p.userId,
                        title: 'Trip Started',
                        body: `Trip ${fromLoc} → ${toLoc} has commenced.`,
                        type: 'TRIP_STARTED',
                    },
                });
            }
        }
        try {
            const recipientIds = [trip.requesterId, ...trip.passengers.map((p) => p.userId).filter(Boolean)];
            (0, notifications_controller_1.emitNotification)({
                userIds: recipientIds,
                title: 'Trip Started',
                body: `Driver ${trip.driver?.user?.name || 'Assigned Driver'} has commenced your trip: ${fromLoc} → ${toLoc}.`,
                type: 'TRIP_STARTED',
                data: { tripId: trip.id },
            });
        }
        catch (notifErr) {
            console.warn('Socket notification error on trip start:', notifErr);
        }
        return res.json({ success: true, message: 'Trip journey started', data: trip });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to start trip' });
    }
};
exports.startTrip = startTrip;
const completeTrip = async (req, res) => {
    try {
        const { id } = req.params;
        const { endOdometer } = req.body;
        const existingTrip = await db_1.prisma.trip.findUniqueOrThrow({
            where: { id },
            include: {
                vehicle: true,
                driver: { include: { user: true } },
                fromOffice: true,
                toOffice: true,
                passengers: true,
            },
        });
        const finalOdometer = parseFloat(endOdometer);
        const startOdo = existingTrip.startOdometer || existingTrip.vehicle?.odometer || finalOdometer;
        const distanceCovered = Math.max(0, Math.round((finalOdometer - startOdo) * 10) / 10);
        const toLoc = existingTrip.toOffice?.name || existingTrip.dropoffAddress || 'Destination';
        const result = await db_1.prisma.$transaction(async (tx) => {
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
            const toLoc = existingTrip.toOffice?.name || existingTrip.dropoffAddress || 'Destination';
            // Notify requester
            await tx.notification.create({
                data: {
                    userId: existingTrip.requesterId,
                    title: 'Trip Completed',
                    body: `Your trip to ${toLoc} has arrived and concluded. Distance covered: ${distanceCovered} km.`,
                    type: 'TRIP_COMPLETED',
                },
            });
            // Notify driver
            if (existingTrip.driver?.userId) {
                await tx.notification.create({
                    data: {
                        userId: existingTrip.driver.userId,
                        title: 'Trip Completed',
                        body: `Trip to ${toLoc} completed successfully. Distance: ${distanceCovered} km. You are now Available.`,
                        type: 'TRIP_COMPLETED',
                    },
                });
            }
            // Notify accompanying colleagues
            for (const p of existingTrip.passengers) {
                if (p.userId) {
                    await tx.notification.create({
                        data: {
                            userId: p.userId,
                            title: 'Trip Completed',
                            body: `Your trip to ${toLoc} has concluded.`,
                            type: 'TRIP_COMPLETED',
                        },
                    });
                }
            }
            return updatedTrip;
        });
        try {
            const recipientIds = [existingTrip.requesterId, ...existingTrip.passengers.map((p) => p.userId).filter(Boolean)];
            if (existingTrip.driver?.userId)
                recipientIds.push(existingTrip.driver.userId);
            (0, notifications_controller_1.emitNotification)({
                userIds: recipientIds,
                title: 'Trip Completed',
                body: `Your trip to ${toLoc} has arrived and concluded. Distance covered: ${distanceCovered} km.`,
                type: 'TRIP_COMPLETED',
                data: { tripId: result.id },
            });
        }
        catch (notifErr) {
            console.warn('Socket notification error on trip completion:', notifErr);
        }
        return res.json({ success: true, message: 'Trip completed successfully', data: result });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to complete trip' });
    }
};
exports.completeTrip = completeTrip;
const cancelTrip = async (req, res) => {
    try {
        const { id } = req.params;
        const trip = await db_1.prisma.trip.findUniqueOrThrow({ where: { id } });
        await db_1.prisma.$transaction(async (tx) => {
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to cancel trip' });
    }
};
exports.cancelTrip = cancelTrip;
