"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("./dashboard.controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.get('/stats', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), dashboard_controller_1.getDashboardStats);
exports.default = router;
