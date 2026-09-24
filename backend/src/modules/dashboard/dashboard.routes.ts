import { Router } from 'express';
import { getDashboardStats } from './dashboard.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.get('/stats', authenticate, authorize(['ADMIN']), getDashboardStats);

export default router;
