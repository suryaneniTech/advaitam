import {
  HostelStudentProfile,
  HostelWardenProfile,
  HostelAttendance,
  HostelRoom,
  HostelBuilding,
  HostelUser,
} from '../../models/hostel/index.js';
import { ApiError } from '../lib/security.js';
import { leaveService } from './leave.js';
import { notificationsService } from './notifications.js';
import { dayKey, nowHHmmInTz, isWithinWindow, isValidTimezone } from '../lib/datetime.js';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

async function upsertAttendance(studentId, date, data) {
  return HostelAttendance.findOneAndUpdate(
    { studentId, date },
    { ...data, studentId, date },
    { new: true, upsert: true },
  );
}

export const attendanceService = {
  async checkIn(studentUserId) {
    const profile = await HostelStudentProfile.findOne({ userId: studentUserId }).populate('hostelId');
    if (!profile) throw ApiError.badRequest('No student profile set up yet');
    if (!profile.hostelId) {
      throw ApiError.badRequest('You are not assigned to a hostel. Ask an admin to set this up.');
    }

    const hostel = profile.hostelId;
    const today = dayKey();

    const existing = await HostelAttendance.findOne({ studentId: profile._id, date: today });
    if (existing && existing.status !== 'REJECTED') return existing;

    const leave = await leaveService.getApprovedLeaveForDate(profile._id, today);
    if (leave) {
      return upsertAttendance(profile._id, today, { status: 'ON_LEAVE', failureReason: null });
    }

    const nowHHmm = nowHHmmInTz(hostel.timezone);
    const open = isWithinWindow(nowHHmm, hostel.attendanceStart, hostel.attendanceEnd);
    if (!open) {
      throw ApiError.badRequest(
        `Attendance is only open between ${hostel.attendanceStart} and ${hostel.attendanceEnd} (${hostel.timezone}). Current time: ${nowHHmm}.`,
      );
    }

    return upsertAttendance(profile._id, today, {
      status: 'PRESENT',
      markedAt: new Date(),
      failureReason: null,
      passedChecks: ['TIME_WINDOW'],
    });
  },

  async myStatus(studentUserId) {
    const profile = await HostelStudentProfile.findOne({ userId: studentUserId }).populate('hostelId');
    if (!profile) throw ApiError.badRequest('No student profile set up yet');

    const today = dayKey();
    const todayRecord = await HostelAttendance.findOne({ studentId: profile._id, date: today });
    const leaveToday = await leaveService.getApprovedLeaveForDate(profile._id, today);

    const history = await HostelAttendance.find({ studentId: profile._id })
      .sort({ date: -1 })
      .limit(60);

    const hostel = profile.hostelId;
    const windowOpen = hostel
      ? isWithinWindow(
          nowHHmmInTz(hostel.timezone),
          hostel.attendanceStart,
          hostel.attendanceEnd,
        )
      : false;

    return {
      hostel: hostel
        ? {
            name: hostel.name,
            attendanceStart: hostel.attendanceStart,
            attendanceEnd: hostel.attendanceEnd,
            timezone: hostel.timezone,
          }
        : null,
      today: todayRecord?.status ?? (leaveToday ? 'ON_LEAVE' : null),
      onLeaveToday: Boolean(leaveToday),
      windowOpen,
      history,
    };
  },

  async wardenRoster(wardenUserId, dateStr) {
    const warden = await HostelWardenProfile.findOne({ userId: wardenUserId });
    if (!warden?.hostelId) throw ApiError.badRequest('You are not assigned to a hostel');

    const date = dateStr ? dayKey(new Date(dateStr)) : dayKey();

    const students = await HostelStudentProfile.find({ hostelId: warden.hostelId })
      .populate('userId')
      .populate('roomId')
      .sort({ 'userId.name': 1 });

    const records = await HostelAttendance.find({
      date,
      studentId: { $in: students.map((s) => s._id) },
    });
    const byStudent = new Map(records.map((r) => [r.studentId.toString(), r]));

    return {
      date: date.toISOString().slice(0, 10),
      students: students.map((s) => ({
        studentId: s.id,
        name: s.userId.name,
        rollNumber: s.rollNumber,
        room: s.roomId?.number ?? null,
        status: byStudent.get(s._id.toString())?.status ?? null,
      })),
    };
  },

  async wardenMark(wardenUserId, studentId, status, dateStr) {
    const warden = await HostelWardenProfile.findOne({ userId: wardenUserId });
    if (!warden?.hostelId) throw ApiError.badRequest('You are not assigned to a hostel');

    const student = await HostelStudentProfile.findById(studentId);
    if (!student || student.hostelId?.toString() !== warden.hostelId.toString()) {
      throw ApiError.forbidden('This student is not in your hostel');
    }

    const date = dateStr ? dayKey(new Date(dateStr)) : dayKey();
    return upsertAttendance(studentId, date, { status, failureReason: 'Marked by warden' });
  },

  async clearMark(wardenUserId, studentId, dateStr) {
    const warden = await HostelWardenProfile.findOne({ userId: wardenUserId });
    if (!warden?.hostelId) throw ApiError.badRequest('You are not assigned to a hostel');

    const student = await HostelStudentProfile.findById(studentId);
    if (!student || student.hostelId?.toString() !== warden.hostelId.toString()) {
      throw ApiError.forbidden('This student is not in your hostel');
    }

    const date = dateStr ? dayKey(new Date(dateStr)) : dayKey();
    await HostelAttendance.deleteMany({ studentId, date });
    return { ok: true };
  },

  async updateMyHostelWindow(wardenUserId, patch) {
    const warden = await HostelWardenProfile.findOne({ userId: wardenUserId });
    if (!warden?.hostelId) throw ApiError.badRequest('You are not assigned to a hostel');

    if (patch.attendanceStart && !HHMM.test(patch.attendanceStart)) {
      throw ApiError.badRequest('attendanceStart must be HH:mm');
    }
    if (patch.attendanceEnd && !HHMM.test(patch.attendanceEnd)) {
      throw ApiError.badRequest('attendanceEnd must be HH:mm');
    }
    if (patch.timezone && !isValidTimezone(patch.timezone)) {
      throw ApiError.badRequest('Invalid timezone. Use an IANA name like "Asia/Kolkata".');
    }

    const data = {};
    if (patch.attendanceStart !== undefined) data.attendanceStart = patch.attendanceStart;
    if (patch.attendanceEnd !== undefined) data.attendanceEnd = patch.attendanceEnd;
    if (patch.timezone !== undefined) data.timezone = patch.timezone;

    const hostel = await HostelBuilding.findByIdAndUpdate(warden.hostelId, data, { new: true });
    return {
      id: hostel.id,
      name: hostel.name,
      attendanceStart: hostel.attendanceStart,
      attendanceEnd: hostel.attendanceEnd,
      timezone: hostel.timezone,
    };
  },

  async getMyHostel(wardenUserId) {
    const warden = await HostelWardenProfile.findOne({ userId: wardenUserId }).populate('hostelId');
    if (!warden?.hostelId) return null;
    const h = warden.hostelId;
    return {
      id: h.id,
      name: h.name,
      attendanceStart: h.attendanceStart,
      attendanceEnd: h.attendanceEnd,
      timezone: h.timezone,
    };
  },

  async hostelStudents(wardenUserId) {
    const warden = await HostelWardenProfile.findOne({ userId: wardenUserId });
    if (!warden?.hostelId) throw ApiError.badRequest('You are not assigned to a hostel');

    const [students, rooms] = await Promise.all([
      HostelStudentProfile.find({ hostelId: warden.hostelId })
        .populate('userId')
        .populate('roomId')
        .sort({ 'userId.name': 1 }),
      HostelRoom.find({ hostelId: warden.hostelId }).sort({ number: 1 }),
    ]);

    return {
      rooms: rooms.map((r) => ({ id: r.id, number: r.number, capacity: r.capacity })),
      students: students.map((s) => ({
        studentId: s.id,
        userId: s.userId.id,
        name: s.userId.name,
        email: s.userId.email,
        phone: s.userId.phone,
        rollNumber: s.rollNumber,
        roomId: s.roomId?.id ?? null,
        roomNumber: s.roomId?.number ?? null,
      })),
    };
  },

  async listAssignableStudents(wardenUserId) {
    const warden = await HostelWardenProfile.findOne({ userId: wardenUserId }).populate('hostelId');
    if (!warden?.hostelId) throw ApiError.badRequest('You are not assigned to a hostel');

    const hostel = await HostelBuilding.findById(warden.hostelId);
    const students = await HostelStudentProfile.find({ hostelId: null })
      .populate({ path: 'userId', match: { role: 'STUDENT', isActive: true, collegeId: hostel.collegeId } });

    return students
      .filter((s) => s.userId)
      .map((s) => ({
        studentId: s.id,
        name: s.userId.name,
        email: s.userId.email,
        rollNumber: s.rollNumber,
      }));
  },

  async addStudentToHostel(wardenUserId, studentId) {
    const warden = await HostelWardenProfile.findOne({ userId: wardenUserId }).populate('hostelId');
    if (!warden?.hostelId) throw ApiError.badRequest('You are not assigned to a hostel');

    const hostel = warden.hostelId;
    const student = await HostelStudentProfile.findById(studentId).populate('userId');
    if (!student) throw ApiError.notFound('Student not found');
    if (student.userId.collegeId?.toString() !== hostel.collegeId.toString()) {
      throw ApiError.forbidden('Student belongs to a different college');
    }
    if (student.hostelId && student.hostelId.toString() !== warden.hostelId.toString()) {
      throw ApiError.conflict('Student is already assigned to another hostel');
    }

    return HostelStudentProfile.findByIdAndUpdate(
      studentId,
      { hostelId: warden.hostelId },
      { new: true },
    ).populate('userId');
  },

  async assignStudentRoom(wardenUserId, studentId, roomId) {
    const warden = await HostelWardenProfile.findOne({ userId: wardenUserId });
    if (!warden?.hostelId) throw ApiError.badRequest('You are not assigned to a hostel');

    const student = await HostelStudentProfile.findById(studentId);
    if (!student || student.hostelId?.toString() !== warden.hostelId.toString()) {
      throw ApiError.forbidden('This student is not in your hostel');
    }

    if (roomId) {
      const room = await HostelRoom.findById(roomId);
      if (!room || room.hostelId.toString() !== warden.hostelId.toString()) {
        throw ApiError.badRequest('Room is not in your hostel');
      }
    }

    return HostelStudentProfile.findByIdAndUpdate(studentId, { roomId }, { new: true })
      .populate('roomId')
      .populate('userId');
  },

  async runAbsentSweep(hostelId, date) {
    const students = await HostelStudentProfile.find({ hostelId })
      .populate('userId')
      .populate({ path: 'parentId', populate: { path: 'userId' } });

    const existing = await HostelAttendance.find({
      date,
      studentId: { $in: students.map((s) => s._id) },
    });
    const marked = new Map(existing.map((r) => [r.studentId.toString(), r]));

    const dateLabel = date.toISOString().slice(0, 10);
    let absent = 0;
    const notifications = [];

    for (const s of students) {
      const rec = marked.get(s._id.toString());
      if (rec && (rec.status === 'PRESENT' || rec.status === 'ON_LEAVE')) continue;

      const leave = await leaveService.getApprovedLeaveForDate(s._id, date);
      if (leave) {
        await upsertAttendance(s._id, date, { status: 'ON_LEAVE' });
        continue;
      }

      await upsertAttendance(s._id, date, {
        status: 'ABSENT',
        failureReason: 'Auto-marked: no check-in',
      });
      absent++;

      notifications.push({
        userId: s.userId._id,
        type: 'MISSED_ATTENDANCE',
        title: 'Missed attendance',
        body: `You were marked absent for ${dateLabel} (no check-in during the attendance window).`,
        metadata: { date: dateLabel, studentId: s.id },
      });

      if (s.parentId?.userId) {
        notifications.push({
          userId: s.parentId.userId._id,
          type: 'MISSED_ATTENDANCE',
          title: 'Your ward missed attendance',
          body: `${s.userId.name} was marked absent for ${dateLabel}.`,
          metadata: { date: dateLabel, studentId: s.id, studentName: s.userId.name },
        });
      }
    }

    const notified = await notificationsService.createMany(notifications);
    return { date: dateLabel, absentMarked: absent, notificationsSent: notified, totalStudents: students.length };
  },

  async wardenRunSweep(wardenUserId, dateStr) {
    const warden = await HostelWardenProfile.findOne({ userId: wardenUserId });
    if (!warden?.hostelId) throw ApiError.badRequest('You are not assigned to a hostel');
    const date = dateStr ? dayKey(new Date(dateStr)) : dayKey();
    return attendanceService.runAbsentSweep(warden.hostelId, date);
  },
};
