import { Router } from 'express';
import { attendanceService } from '../services/attendance.js';
import { authenticate, requireRoles } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

router.post('/check-in', requireRoles('STUDENT'), async (req, res, next) => {
  try {
    res.json(await attendanceService.checkIn(req.hostelUser.sub));
  } catch (err) {
    next(err);
  }
});

router.get('/me', requireRoles('STUDENT'), async (req, res, next) => {
  try {
    res.json(await attendanceService.myStatus(req.hostelUser.sub));
  } catch (err) {
    next(err);
  }
});

router.get('/roster', requireRoles('WARDEN'), async (req, res, next) => {
  try {
    res.json(await attendanceService.wardenRoster(req.hostelUser.sub, req.query.date));
  } catch (err) {
    next(err);
  }
});

router.post('/mark', requireRoles('WARDEN'), async (req, res, next) => {
  try {
    const { studentId, status, date } = req.body;
    res.json(await attendanceService.wardenMark(req.hostelUser.sub, studentId, status, date));
  } catch (err) {
    next(err);
  }
});

router.post('/clear', requireRoles('WARDEN'), async (req, res, next) => {
  try {
    res.json(await attendanceService.clearMark(req.hostelUser.sub, req.body.studentId, req.body.date));
  } catch (err) {
    next(err);
  }
});

router.get('/my-hostel', requireRoles('WARDEN'), async (req, res, next) => {
  try {
    res.json(await attendanceService.getMyHostel(req.hostelUser.sub));
  } catch (err) {
    next(err);
  }
});

router.patch('/my-hostel/window', requireRoles('WARDEN'), async (req, res, next) => {
  try {
    res.json(await attendanceService.updateMyHostelWindow(req.hostelUser.sub, req.body));
  } catch (err) {
    next(err);
  }
});

router.get('/students', requireRoles('WARDEN'), async (req, res, next) => {
  try {
    res.json(await attendanceService.hostelStudents(req.hostelUser.sub));
  } catch (err) {
    next(err);
  }
});

router.get('/assignable-students', requireRoles('WARDEN'), async (req, res, next) => {
  try {
    res.json(await attendanceService.listAssignableStudents(req.hostelUser.sub));
  } catch (err) {
    next(err);
  }
});

router.post('/add-student', requireRoles('WARDEN'), async (req, res, next) => {
  try {
    res.json(await attendanceService.addStudentToHostel(req.hostelUser.sub, req.body.studentId));
  } catch (err) {
    next(err);
  }
});

router.post('/run-sweep', requireRoles('WARDEN'), async (req, res, next) => {
  try {
    res.json(await attendanceService.wardenRunSweep(req.hostelUser.sub, req.body.date));
  } catch (err) {
    next(err);
  }
});

router.post('/assign-room', requireRoles('WARDEN'), async (req, res, next) => {
  try {
    res.json(
      await attendanceService.assignStudentRoom(req.hostelUser.sub, req.body.studentId, req.body.roomId),
    );
  } catch (err) {
    next(err);
  }
});

export default router;
