"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFcmToken = exports.getMe = exports.register = exports.login = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const db_1 = require("../../config/db");
const jwt_1 = require("../../utils/jwt");
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }
        const user = await db_1.prisma.user.findUnique({
            where: { email },
            include: {
                driverProfile: true,
                organization: true,
            },
        });
        if (!user || !user.isActive) {
            return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account' });
        }
        const isValidPassword = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        const token = (0, jwt_1.generateToken)({
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
    }
    catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
exports.login = login;
const register = async (req, res) => {
    try {
        const { name, email, password, role = 'EMPLOYEE', department, employeeId, licenseNumber, licenseExpiry } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ success: false, message: 'Name, email, and password are required' });
        }
        const existingUser = await db_1.prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email is already registered' });
        }
        // Default to first organization or create one
        let org = await db_1.prisma.organization.findFirst();
        if (!org) {
            org = await db_1.prisma.organization.create({
                data: { name: 'AppTriangle Corporate Fleet' },
            });
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const user = await db_1.prisma.user.create({
            data: {
                name,
                email,
                passwordHash,
                role: role,
                department,
                employeeId,
                organizationId: org.id,
                driverProfile: role === 'DRIVER'
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
        const token = (0, jwt_1.generateToken)({
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
    }
    catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
    }
};
exports.register = register;
const getMe = async (req, res) => {
    try {
        if (!req.user) {
            return res.status(401).json({ success: false, message: 'Unauthenticated' });
        }
        const user = await db_1.prisma.user.findUnique({
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
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to fetch user' });
    }
};
exports.getMe = getMe;
const updateFcmToken = async (req, res) => {
    try {
        const { fcmToken } = req.body;
        if (!req.user)
            return res.status(401).json({ success: false });
        await db_1.prisma.user.update({
            where: { id: req.user.userId },
            data: { fcmToken },
        });
        return res.json({ success: true, message: 'FCM Token updated' });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Failed to update token' });
    }
};
exports.updateFcmToken = updateFcmToken;
