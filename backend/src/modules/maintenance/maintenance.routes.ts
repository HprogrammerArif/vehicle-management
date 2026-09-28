import { Router } from 'express';
import {
  createMaintenanceLog,
  getMaintenanceLogs,
  completeMaintenance,
} from './maintenance.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.get('/', authenticate, getMaintenanceLogs);
router.post('/', authenticate, authorize(['ADMIN', 'DRIVER']), createMaintenanceLog);
router.put('/:id/complete', authenticate, authorize(['ADMIN']), completeMaintenance);

export default router;
