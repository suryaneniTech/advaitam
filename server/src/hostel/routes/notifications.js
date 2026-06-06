import { Router } from 'express';
import { notificationsService } from '../services/notifications.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    res.json(await notificationsService.listMine(req.hostelUser.sub));
  } catch (err) {
    next(err);
  }
});

router.get('/unread-count', async (req, res, next) => {
  try {
    res.json({ count: await notificationsService.unreadCount(req.hostelUser.sub) });
  } catch (err) {
    next(err);
  }
});

router.post('/read-all', async (req, res, next) => {
  try {
    res.json(await notificationsService.markAllRead(req.hostelUser.sub));
  } catch (err) {
    next(err);
  }
});

router.get('/warden-log', requireRoles('WARDEN'), async (req, res, next) => {
  try {
    res.json(await notificationsService.wardenLog(req.hostelUser.sub));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/read', async (req, res, next) => {
  try {
    res.json(await notificationsService.markRead(req.hostelUser.sub, req.params.id));
  } catch (err) {
    next(err);
  }
});

export default router;
