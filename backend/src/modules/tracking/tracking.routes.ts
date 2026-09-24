import { Router } from 'express';
import { getTripRoute, getFleetLocations, startTripSimulation } from './tracking.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.get('/fleet', authenticate, getFleetLocations);
router.get('/route/:tripId', authenticate, getTripRoute);
router.post('/simulate/:tripId', authenticate, startTripSimulation);

export default router;
