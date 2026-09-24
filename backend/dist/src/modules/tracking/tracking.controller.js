"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startTripSimulation = exports.getFleetLocations = exports.getTripRoute = exports.setTrackingIo = void 0;
const db_1 = require("../../config/db");
// Reference to global io instance passed from server.ts
let ioInstance = null;
const setTrackingIo = (io) => {
    ioInstance = io;
};
exports.setTrackingIo = setTrackingIo;
// Store active simulation timer to allow stopping
const activeSimulations = new Map();
const getTripRoute = async (req, res) => {
    try {
        const { tripId } = req.params;
        const points = await db_1.prisma.trackingPoint.findMany({
            where: { tripId },
            orderBy: { timestamp: 'asc' },
        });
        return res.json({ success: true, data: points });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch trip route' });
    }
};
exports.getTripRoute = getTripRoute;
const getFleetLocations = async (req, res) => {
    try {
        const activeTrips = await db_1.prisma.trip.findMany({
            where: {
                status: { in: ['IN_PROGRESS', 'APPROVED'] },
            },
            include: {
                vehicle: true,
                driver: { include: { user: { select: { name: true, phone: true } } } },
                fromOffice: true,
                toOffice: true,
            },
        });
        const fleet = activeTrips.map((trip) => ({
            tripId: trip.id,
            vehicleId: trip.vehicleId,
            vehicleModel: trip.vehicle?.model,
            registrationNo: trip.vehicle?.registrationNo,
            driverName: trip.driver?.user.name,
            driverPhone: trip.driver?.user.phone,
            latitude: trip.driver?.currentLat || trip.fromOffice.latitude || 23.8103,
            longitude: trip.driver?.currentLng || trip.fromOffice.longitude || 90.4125,
            from: trip.fromOffice.name,
            to: trip.toOffice.name,
            status: trip.status,
        }));
        return res.json({ success: true, data: fleet });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch fleet locations' });
    }
};
exports.getFleetLocations = getFleetLocations;
/**
 * Start a real-time live route simulation over WebSockets
 * Emits moving coordinates step-by-step to demonstrate the live map tracker!
 */
const startTripSimulation = async (req, res) => {
    try {
        const { tripId } = req.params;
        const trip = await db_1.prisma.trip.findUniqueOrThrow({
            where: { id: tripId },
            include: {
                fromOffice: true,
                toOffice: true,
                vehicle: true,
                driver: { include: { user: true } },
            },
        });
        if (!ioInstance) {
            return res.status(500).json({ success: false, message: 'Socket server not ready' });
        }
        // Stop any existing simulation for this trip
        if (activeSimulations.has(tripId)) {
            clearInterval(activeSimulations.get(tripId));
            activeSimulations.delete(tripId);
        }
        // Origin and Destination Coordinates (Default to Dhaka HQ -> Gazipur Factory if null)
        const startLat = trip.fromOffice.latitude || 23.8103;
        const startLng = trip.fromOffice.longitude || 90.4125;
        const endLat = trip.toOffice.latitude || 24.0023;
        const endLng = trip.toOffice.longitude || 90.4244;
        const totalSteps = 25;
        let currentStep = 0;
        // Mark trip as IN_PROGRESS if not already
        await db_1.prisma.trip.update({
            where: { id: tripId },
            data: { status: 'IN_PROGRESS', startedAt: new Date() },
        });
        const timer = setInterval(async () => {
            if (currentStep > totalSteps) {
                clearInterval(timer);
                activeSimulations.delete(tripId);
                // Optionally complete the trip at destination
                ioInstance?.to('admin_fleet').emit('trip:completed', { tripId });
                return;
            }
            const fraction = currentStep / totalSteps;
            // Add slight organic curves to coordinate steps
            const lat = startLat + (endLat - startLat) * fraction + Math.sin(fraction * Math.PI) * 0.005;
            const lng = startLng + (endLng - startLng) * fraction;
            const speed = Math.floor(40 + Math.random() * 25); // 40 - 65 km/h
            const heading = 15;
            const payload = {
                tripId,
                vehicleId: trip.vehicleId,
                registrationNo: trip.vehicle?.registrationNo,
                vehicleModel: trip.vehicle?.model,
                driverName: trip.driver?.user.name,
                latitude: lat,
                longitude: lng,
                speed,
                heading,
                step: currentStep,
                totalSteps,
                timestamp: new Date().toISOString(),
            };
            // Broadcast live position to admin map room and specific trip room
            ioInstance?.to('admin_fleet').emit('vehicle:location', payload);
            ioInstance?.to(`trip_${tripId}`).emit('vehicle:location', payload);
            // Save tracking point
            await db_1.prisma.trackingPoint.create({
                data: {
                    tripId,
                    driverId: trip.driverId || 'simulated',
                    latitude: lat,
                    longitude: lng,
                    speed,
                    heading,
                },
            }).catch(() => { });
            if (trip.driverId) {
                await db_1.prisma.driver.update({
                    where: { id: trip.driverId },
                    data: { currentLat: lat, currentLng: lng, lastLocationAt: new Date() },
                }).catch(() => { });
            }
            currentStep++;
        }, 1500); // Emits every 1.5 seconds
        activeSimulations.set(tripId, timer);
        return res.json({
            success: true,
            message: 'Real-time vehicle movement simulation initiated! Coordinates streaming every 1.5s',
            tripId,
            totalSteps,
        });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Simulation error' });
    }
};
exports.startTripSimulation = startTripSimulation;
