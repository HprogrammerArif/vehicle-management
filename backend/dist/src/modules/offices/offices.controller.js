"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createOffice = exports.getOffices = void 0;
const db_1 = require("../../config/db");
const getOffices = async (req, res) => {
    try {
        const offices = await db_1.prisma.office.findMany({
            orderBy: { name: 'asc' },
        });
        return res.json({ success: true, data: offices });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch offices' });
    }
};
exports.getOffices = getOffices;
const createOffice = async (req, res) => {
    try {
        const { name, type, address, latitude, longitude } = req.body;
        let org = await db_1.prisma.organization.findFirst();
        if (!org) {
            org = await db_1.prisma.organization.create({
                data: { name: 'AppTriangle Corporate Fleet' },
            });
        }
        const office = await db_1.prisma.office.create({
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message || 'Failed to create office' });
    }
};
exports.createOffice = createOffice;
