import { Router } from 'express';
import authRoutes from './routes/auth.js';
import usersRoutes from './routes/users.js';
import hostelsRoutes from './routes/hostels.js';
import attendanceRoutes from './routes/attendance.js';
import leaveRoutes from './routes/leave.js';
import notificationsRoutes from './routes/notifications.js';
import { hostelErrorHandler } from './middleware/errorHandler.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', service: 'hostel' }));

router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/hostels', hostelsRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leave', leaveRoutes);
router.use('/notifications', notificationsRoutes);

router.use(hostelErrorHandler);

export default router;
