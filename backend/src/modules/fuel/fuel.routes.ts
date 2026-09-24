import { Router } from 'express';
import { logFuel, getFuelLogs, getFuelAnalytics } from './fuel.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.post('/', authenticate, authorize(['DRIVER', 'ADMIN']), logFuel);
router.get('/', authenticate, getFuelLogs);
router.get('/analytics', authenticate, authorize(['ADMIN']), getFuelAnalytics);

export default router;
