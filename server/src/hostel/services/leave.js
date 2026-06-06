import {
  HostelStudentProfile,
  HostelParentProfile,
  HostelWardenProfile,
  HostelLeaveRequest,
  HostelLeaveApproval,
} from '../../models/hostel/index.js';
import { ApiError } from '../lib/security.js';

export const leaveService = {
  async submit(studentUserId, input) {
    const profile = await HostelStudentProfile.findOne({ userId: studentUserId });
    if (!profile) throw ApiError.badRequest('No student profile. Ask an admin to set up your profile.');

    const start = new Date(input.startDate);
    const end = new Date(input.endDate);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw ApiError.badRequest('Invalid dates');
    }
    if (end < start) throw ApiError.badRequest('End date cannot be before start date');
    if (!profile.parentId) {
      throw ApiError.badRequest(
        'No parent linked to your profile yet. An admin must link a parent before you can request leave.',
      );
    }

    return HostelLeaveRequest.create({
      studentId: profile._id,
      startDate: start,
      endDate: end,
      reason: input.reason,
      status: 'PENDING_PARENT',
    });
  },

  async listMine(studentUserId) {
    const profile = await HostelStudentProfile.findOne({ userId: studentUserId });
    if (!profile) return [];
    const leaves = await HostelLeaveRequest.find({ studentId: profile._id })
      .sort({ createdAt: -1 })
      .lean();
    const result = [];
    for (const leave of leaves) {
      const approvals = await HostelLeaveApproval.find({ leaveRequestId: leave._id }).lean();
      result.push({ ...leave, id: leave._id.toString(), approvals: approvals.map((a) => ({ ...a, id: a._id.toString() })) });
    }
    return result;
  },

  async cancel(studentUserId, leaveId) {
    const profile = await HostelStudentProfile.findOne({ userId: studentUserId });
    const leave = await HostelLeaveRequest.findById(leaveId);
    if (!leave || leave.studentId.toString() !== profile?._id.toString()) {
      throw ApiError.notFound('Leave request not found');
    }
    if (leave.status !== 'PENDING_PARENT' && leave.status !== 'PENDING_WARDEN') {
      throw ApiError.badRequest('Only pending requests can be cancelled');
    }
    return HostelLeaveRequest.findByIdAndUpdate(leaveId, { status: 'CANCELLED' }, { new: true });
  },

  async listForParent(parentUserId) {
    const parent = await HostelParentProfile.findOne({ userId: parentUserId });
    if (!parent) return [];
    const children = await HostelStudentProfile.find({ parentId: parent._id }).select('_id');
    const studentIds = children.map((c) => c._id);
    const leaves = await HostelLeaveRequest.find({ studentId: { $in: studentIds } }).sort({ createdAt: -1 });
    return populateLeaveList(leaves);
  },

  async listForWarden(wardenUserId) {
    const warden = await HostelWardenProfile.findOne({ userId: wardenUserId });
    if (!warden?.hostelId) return [];
    const students = await HostelStudentProfile.find({ hostelId: warden.hostelId }).select('_id');
    const studentIds = students.map((s) => s._id);
    const leaves = await HostelLeaveRequest.find({ studentId: { $in: studentIds } }).sort({ createdAt: -1 });
    return populateLeaveList(leaves);
  },

  async decide(actorUserId, actorRole, leaveId, decision, comment) {
    const leave = await HostelLeaveRequest.findById(leaveId);
    if (!leave) throw ApiError.notFound('Leave request not found');
    const student = await HostelStudentProfile.findById(leave.studentId);

    if (actorRole === 'PARENT') {
      if (leave.status !== 'PENDING_PARENT') {
        throw ApiError.badRequest('This request is not awaiting parent approval');
      }
      const parent = await HostelParentProfile.findOne({ userId: actorUserId });
      if (!parent || student.parentId?.toString() !== parent._id.toString()) {
        throw ApiError.forbidden('You are not the parent for this student');
      }
      const nextStatus = decision === 'APPROVED' ? 'PENDING_WARDEN' : 'REJECTED';
      return leaveService.commitDecision(leaveId, 'PARENT', decision, actorUserId, nextStatus, comment);
    }

    if (leave.status !== 'PENDING_WARDEN') {
      throw ApiError.badRequest('This request is not awaiting warden approval');
    }
    const warden = await HostelWardenProfile.findOne({ userId: actorUserId });
    if (!warden?.hostelId || student.hostelId?.toString() !== warden.hostelId.toString()) {
      throw ApiError.forbidden('This student is not in your hostel');
    }
    const nextStatus = decision === 'APPROVED' ? 'APPROVED' : 'REJECTED';
    return leaveService.commitDecision(leaveId, 'WARDEN', decision, actorUserId, nextStatus, comment);
  },

  async commitDecision(leaveId, stage, decision, decidedById, nextStatus, comment) {
    await HostelLeaveApproval.create({
      leaveRequestId: leaveId,
      stage,
      decision,
      decidedById,
      comment,
    });
    return HostelLeaveRequest.findByIdAndUpdate(leaveId, { status: nextStatus }, { new: true });
  },

  async getApprovedLeaveForDate(studentProfileId, date) {
    return HostelLeaveRequest.findOne({
      studentId: studentProfileId,
      status: 'APPROVED',
      startDate: { $lte: date },
      endDate: { $gte: date },
    });
  },
};

async function populateLeaveList(leaves) {
  const result = [];
  for (const leave of leaves) {
    const student = await HostelStudentProfile.findById(leave.studentId).populate('userId');
    const approvals = await HostelLeaveApproval.find({ leaveRequestId: leave._id });
    const obj = leave.toObject();
    obj.student = { ...student.toObject(), user: student.userId };
    obj.approvals = approvals.map((a) => a.toObject());
    result.push(obj);
  }
  return result;
}
