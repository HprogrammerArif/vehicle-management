"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const trips_controller_1 = require("./trips.controller");
const auth_1 = require("../../middleware/auth");
const router = (0, express_1.Router)();
router.post('/', auth_1.authenticate, trips_controller_1.createTrip);
router.get('/', auth_1.authenticate, trips_controller_1.getTrips);
router.get('/my', auth_1.authenticate, trips_controller_1.getMyTrips); // Mobile: employee/driver own trips
router.get('/:id', auth_1.authenticate, trips_controller_1.getTripById);
router.put('/:id/approve', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), trips_controller_1.approveAndAssignTrip);
router.put('/:id/reject', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), trips_controller_1.rejectTrip);
router.put('/:id/start', auth_1.authenticate, (0, auth_1.authorize)(['DRIVER', 'ADMIN']), trips_controller_1.startTrip);
router.put('/:id/complete', auth_1.authenticate, (0, auth_1.authorize)(['DRIVER', 'ADMIN']), trips_controller_1.completeTrip);
router.put('/:id/cancel', auth_1.authenticate, trips_controller_1.cancelTrip);
exports.default = router;
