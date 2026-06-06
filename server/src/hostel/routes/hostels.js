import { Router } from 'express';
import { collegesService, hostelsService, roomsService } from '../services/hostels.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { HostelAuditLog } from '../../models/hostel/index.js';

const router = Router();
router.use(authenticate, requireRoles('SUPER_ADMIN'));

async function audit(req, action, entity, entityId, metadata) {
  await HostelAuditLog.create({
    userId: req.hostelUser.sub,
    action,
    entity,
    entityId,
    metadata,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
}

router.get('/colleges', async (req, res, next) => {
  try {
    res.json(await collegesService.list(req.hostelUser.collegeId));
  } catch (err) {
    next(err);
  }
});

router.post('/colleges', async (req, res, next) => {
  try {
    const { name, code, address } = req.body;
    if (!name || !code) return res.status(400).json({ error: 'name and code required' });
    const college = await collegesService.create({ name, code, address });
    await audit(req, 'COLLEGE_CREATED', 'College', college.id);
    res.status(201).json(college);
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    res.json(await hostelsService.list(req.hostelUser.collegeId, req.query.collegeId));
  } catch (err) {
    next(err);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    res.json(await hostelsService.getById(req.params.id, req.hostelUser.collegeId));
  } catch (err) {
    next(err);
  }
});

router.post('/', async (req, res, next) => {
  try {
    const hostel = await hostelsService.create(req.hostelUser.collegeId, req.body);
    await audit(req, 'HOSTEL_CREATED', 'Hostel', hostel.id);
    res.status(201).json(hostel);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const hostel = await hostelsService.update(req.params.id, req.hostelUser.collegeId, req.body);
    await audit(req, 'HOSTEL_UPDATED', 'Hostel', hostel.id, req.body);
    res.json(hostel);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await hostelsService.remove(req.params.id, req.hostelUser.collegeId);
    await audit(req, 'HOSTEL_DELETED', 'Hostel', req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.post('/rooms', async (req, res, next) => {
  try {
    const room = await roomsService.create(req.hostelUser.collegeId, req.body);
    await audit(req, 'ROOM_CREATED', 'Room', room.id);
    res.status(201).json(room);
  } catch (err) {
    next(err);
  }
});

router.delete('/rooms/:id', async (req, res, next) => {
  try {
    await roomsService.remove(req.params.id, req.hostelUser.collegeId);
    await audit(req, 'ROOM_DELETED', 'Room', req.params.id);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
