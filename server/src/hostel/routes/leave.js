import { Router } from 'express';
import { leaveService } from '../services/leave.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.get('/mine', requireRoles('STUDENT'), async (req, res, next) => {
  try {
    res.json(await leaveService.listMine(req.hostelUser.sub));
  } catch (err) {
    next(err);
  }
});

router.post('/', requireRoles('STUDENT'), async (req, res, next) => {
  try {
    res.status(201).json(await leaveService.submit(req.hostelUser.sub, req.body));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/cancel', requireRoles('STUDENT'), async (req, res, next) => {
  try {
    res.json(await leaveService.cancel(req.hostelUser.sub, req.params.id));
  } catch (err) {
    next(err);
  }
});

router.get('/parent', requireRoles('PARENT'), async (req, res, next) => {
  try {
    res.json(await leaveService.listForParent(req.hostelUser.sub));
  } catch (err) {
    next(err);
  }
});

router.get('/warden', requireRoles('WARDEN'), async (req, res, next) => {
  try {
    res.json(await leaveService.listForWarden(req.hostelUser.sub));
  } catch (err) {
    next(err);
  }
});

router.post('/:id/decision', requireRoles('PARENT', 'WARDEN'), async (req, res, next) => {
  try {
    const result = await leaveService.decide(
      req.hostelUser.sub,
      req.hostelUser.role,
      req.params.id,
      req.body.decision,
      req.body.comment,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
