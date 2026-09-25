import { Router } from 'express';
import {
  createTrip,
  getTrips,
  getMyTrips,
  getTripById,
  approveAndAssignTrip,
  rejectTrip,
  startTrip,
  completeTrip,
  cancelTrip,
} from './trips.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.post('/', authenticate, createTrip);
router.get('/', authenticate, getTrips);
router.get('/my', authenticate, getMyTrips);   // Mobile: employee/driver own trips
router.get('/:id', authenticate, getTripById);
router.put('/:id/approve', authenticate, authorize(['ADMIN']), approveAndAssignTrip);
router.put('/:id/reject', authenticate, authorize(['ADMIN']), rejectTrip);
router.put('/:id/start', authenticate, authorize(['DRIVER', 'ADMIN']), startTrip);
router.put('/:id/complete', authenticate, authorize(['DRIVER', 'ADMIN']), completeTrip);
router.put('/:id/cancel', authenticate, cancelTrip);

export default router;

