import { Router } from 'express';
import {
  getMyNotifications,
  markNotificationRead,
  markAllRead,
  sendNotification,
} from './notifications.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.get('/my', authenticate, getMyNotifications);
router.patch('/read-all', authenticate, markAllRead);
router.patch('/:id/read', authenticate, markNotificationRead);
router.post('/send', authenticate, authorize(['ADMIN']), sendNotification);

export default router;
