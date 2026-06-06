import { Router } from 'express';
import { usersService } from '../services/users.js';
import { profilesService } from '../services/profiles.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { HostelAuditLog } from '../../models/hostel/index.js';

const router = Router();
router.use(authenticate, requireRoles('SUPER_ADMIN'));

async function audit(req, action, entityId, metadata) {
  await HostelAuditLog.create({
    userId: req.hostelUser.sub,
    action,
    entity: 'User',
    entityId,
    metadata,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
}

router.get('/', async (req, res, next) => {
  try {
    const { role, search, page = 1, pageSize = 20 } = req.query;
    const result = await usersService.list({
      requesterCollegeId: req.hostelUser.collegeId,
      role,
      search,
      page: Number(page),
      pageSize: Number(pageSize),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    res.json(await usersService.getById(req.params.id, req.hostelUser.collegeId));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const { email, name, role, phone, password } = req.body;
    if (!email || !name || !role) return res.status(400).json({ error: 'email, name, role required' });
    const result = await usersService.create({
      email,
      name,
      role,
      phone,
      password,
      collegeId: req.hostelUser.collegeId,
    });
    await audit(req, 'USER_CREATED', result.user.id, { role });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const user = await usersService.update(req.params.id, req.hostelUser.collegeId, req.body);
    await audit(req, 'USER_UPDATED', user.id, req.body);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const user = await usersService.deactivate(req.params.id, req.hostelUser.collegeId);
    await audit(req, 'USER_DEACTIVATED', user.id);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.post('/:id/reset-password', async (req, res, next) => {
  try {
    const result = await usersService.resetPassword(req.params.id, req.hostelUser.collegeId);
    await audit(req, 'USER_PASSWORD_RESET', req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/:id/student-profile', async (req, res, next) => {
  try {
    res.json(await profilesService.getStudentByUserId(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/student-profile', async (req, res, next) => {
  try {
    const profile = await profilesService.updateStudentProfile(req.params.id, req.body);
    await audit(req, 'STUDENT_PROFILE_UPDATED', req.params.id, req.body);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/warden-hostel', async (req, res, next) => {
  try {
    const profile = await profilesService.assignWardenHostel(req.params.id, req.body.hostelId ?? null);
    await audit(req, 'WARDEN_HOSTEL_ASSIGNED', req.params.id, req.body);
    res.json(profile);
  } catch (err) {
    next(err);
  }
});

export default router;
