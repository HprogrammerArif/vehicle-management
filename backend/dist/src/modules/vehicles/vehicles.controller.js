"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteVehicle = exports.updateVehicle = exports.createVehicle = exports.getVehicleById = exports.getAvailableVehicles = exports.getVehicles = void 0;
const db_1 = require("../../config/db");
const getVehicles = async (req, res) => {
    try {
        const { status, type, search } = req.query;
        const where = {};
        if (status)
            where.status = status;
        if (type)
            where.type = type;
        if (search) {
            where.OR = [
                { registrationNo: { contains: String(search), mode: 'insensitive' } },
                { make: { contains: String(search), mode: 'insensitive' } },
                { model: { contains: String(search), mode: 'insensitive' } },
            ];
        }
        const vehicles = await db_1.prisma.vehicle.findMany({
            where,
            include: {
                _count: {
                    select: { trips: true, fuelLogs: true, maintenanceLogs: true },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ success: true, data: vehicles });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch vehicles' });
    }
};
exports.getVehicles = getVehicles;
const getAvailableVehicles = async (req, res) => {
    try {
        const vehicles = await db_1.prisma.vehicle.findMany({
            where: {
                status: 'AVAILABLE',
            },
            orderBy: { model: 'asc' },
        });
        return res.json({ success: true, data: vehicles });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch available vehicles' });
    }
};
exports.getAvailableVehicles = getAvailableVehicles;
const getVehicleById = async (req, res) => {
    try {
        const { id } = req.params;
        const vehicle = await db_1.prisma.vehicle.findUnique({
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch vehicle' });
    }
};
exports.getVehicleById = getVehicleById;
const createVehicle = async (req, res) => {
    try {
        const { registrationNo, make, model, year, type, capacity, fuelType, fuelEfficiency, odometer, photo } = req.body;
        let org = await db_1.prisma.organization.findFirst();
        if (!org) {
            org = await db_1.prisma.organization.create({ data: { name: 'AppTriangle Corporate Fleet' } });
        }
        const vehicle = await db_1.prisma.vehicle.create({
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to create vehicle' });
    }
};
exports.createVehicle = createVehicle;
const updateVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        const { status, odometer, photo, fuelEfficiency, make, model, type, capacity } = req.body;
        const vehicle = await db_1.prisma.vehicle.update({
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to update vehicle' });
    }
};
exports.updateVehicle = updateVehicle;
const deleteVehicle = async (req, res) => {
    try {
        const { id } = req.params;
        await db_1.prisma.vehicle.delete({ where: { id } });
        return res.json({ success: true, message: 'Vehicle deleted successfully' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to delete vehicle' });
    }
};
exports.deleteVehicle = deleteVehicle;
