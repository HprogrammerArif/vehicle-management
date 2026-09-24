import { Router } from 'express';
import { login, register, getMe, updateFcmToken } from './auth.controller';
import { authenticate } from '../../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.get('/me', authenticate, getMe);
router.put('/fcm-token', authenticate, updateFcmToken);

export default router;
