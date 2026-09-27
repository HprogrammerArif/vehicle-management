"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.post('/login', auth_controller_1.login);
router.post('/register', auth_controller_1.register);
router.get('/me', auth_1.authenticate, auth_controller_1.getMe);
router.put('/fcm-token', auth_1.authenticate, auth_controller_1.updateFcmToken);
router.get('/lookup-employee', auth_1.authenticate, auth_controller_1.lookupEmployee);
// Admin User Management
router.post('/users', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), auth_controller_1.createUser);
router.get('/users', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), auth_controller_1.listUsers);
router.delete('/users/:id', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), auth_controller_1.deleteUser);
exports.default = router;
