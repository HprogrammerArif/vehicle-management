import { Router } from 'express';
import {
  getDrivers,
  getAvailableDrivers,
  getDriverById,
  updateDriverStatus,
  requestLeave,
  approveLeave,
} from './drivers.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.get('/', authenticate, getDrivers);
router.get('/available', authenticate, getAvailableDrivers);
router.get('/:id', authenticate, getDriverById);
router.put('/:id/status', authenticate, authorize(['ADMIN', 'DRIVER']), updateDriverStatus);
router.post('/leave', authenticate, authorize(['DRIVER', 'ADMIN']), requestLeave);
router.put('/leave/:leaveId', authenticate, authorize(['ADMIN']), approveLeave);

export default router;
