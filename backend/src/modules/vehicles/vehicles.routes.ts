import { Router } from 'express';
import {
  getVehicles,
  getAvailableVehicles,
  getVehicleById,
  createVehicle,
  updateVehicle,
  deleteVehicle,
} from './vehicles.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.get('/', authenticate, getVehicles);
router.get('/available', authenticate, getAvailableVehicles);
router.get('/:id', authenticate, getVehicleById);
router.post('/', authenticate, authorize(['ADMIN']), createVehicle);
router.put('/:id', authenticate, authorize(['ADMIN']), updateVehicle);
router.delete('/:id', authenticate, authorize(['ADMIN']), deleteVehicle);

export default router;
