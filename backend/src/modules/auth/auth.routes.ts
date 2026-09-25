import { Router } from 'express';
import {
  login,
  register,
  getMe,
  updateFcmToken,
  lookupEmployee,
  createUser,
  listUsers,
  deleteUser,
} from './auth.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.post('/login', login);
router.post('/register', register);
router.get('/me', authenticate, getMe);
router.put('/fcm-token', authenticate, updateFcmToken);
router.get('/lookup-employee', authenticate, lookupEmployee);

// Admin User Management
router.post('/users', authenticate, authorize(['ADMIN']), createUser);
router.get('/users', authenticate, authorize(['ADMIN']), listUsers);
router.delete('/users/:id', authenticate, authorize(['ADMIN']), deleteUser);

export default router;
