"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const offices_controller_1 = require("./offices.controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', auth_1.authenticate, offices_controller_1.getOffices);
router.post('/', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), offices_controller_1.createOffice);
exports.default = router;
