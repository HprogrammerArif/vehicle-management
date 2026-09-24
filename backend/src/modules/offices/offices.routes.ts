import { Router } from 'express';
import { getOffices, createOffice } from './offices.controller';
import { authenticate, authorize } from '../../middleware/auth';

const router = Router();

router.get('/', authenticate, getOffices);
router.post('/', authenticate, authorize(['ADMIN']), createOffice);

export default router;
