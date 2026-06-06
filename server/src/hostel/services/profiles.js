import {
  HostelUser,
  HostelStudentProfile,
  HostelParentProfile,
  HostelWardenProfile,
  HostelBuilding,
  HostelRoom,
} from '../../models/hostel/index.js';
import { ApiError } from '../lib/security.js';

export const profilesService = {
  async ensureProfile(userId) {
    const user = await HostelUser.findById(userId);
    if (!user) throw ApiError.notFound('User not found');

    switch (user.role) {
      case 'STUDENT': {
        const existing = await HostelStudentProfile.findOne({ userId });
        if (!existing) {
          await HostelStudentProfile.create({
            userId,
            rollNumber: `TEMP-${userId.toString().slice(-6)}`,
          });
        }
        break;
      }
      case 'PARENT': {
        const existing = await HostelParentProfile.findOne({ userId });
        if (!existing) await HostelParentProfile.create({ userId });
        break;
      }
      case 'WARDEN': {
        const existing = await HostelWardenProfile.findOne({ userId });
        if (!existing) await HostelWardenProfile.create({ userId });
        break;
      }
      default:
        break;
    }
  },

  async getStudentByUserId(userId) {
    const profile = await HostelStudentProfile.findOne({ userId })
      .populate('userId')
      .populate('hostelId')
      .populate('roomId')
      .populate({ path: 'parentId', populate: { path: 'userId' } });

    if (!profile) throw ApiError.notFound('Student profile not found');

    const obj = profile.toObject();
    obj.user = obj.userId;
    obj.hostel = obj.hostelId;
    obj.room = obj.roomId;
    if (obj.parentId) {
      obj.parent = { ...obj.parentId, user: obj.parentId.userId };
    }
    delete obj.userId;
    delete obj.hostelId;
    delete obj.roomId;
    return obj;
  },

  async updateStudentProfile(studentUserId, patch) {
    await profilesService.ensureProfile(studentUserId);

    let parentId;
    if (patch.parentUserId !== undefined) {
      if (patch.parentUserId === null) {
        parentId = null;
      } else {
        const parentUser = await HostelUser.findById(patch.parentUserId);
        if (!parentUser || parentUser.role !== 'PARENT') {
          throw ApiError.badRequest('parentUserId must reference a PARENT user');
        }
        await profilesService.ensureProfile(parentUser.id);
        const pp = await HostelParentProfile.findOne({ userId: parentUser._id });
        parentId = pp._id;
      }
    }

    const data = {};
    if (patch.rollNumber !== undefined) data.rollNumber = patch.rollNumber;
    if (patch.hostelId !== undefined) data.hostelId = patch.hostelId;
    if (patch.roomId !== undefined) data.roomId = patch.roomId;
    if (parentId !== undefined) data.parentId = parentId;

    const profile = await HostelStudentProfile.findOneAndUpdate(
      { userId: studentUserId },
      data,
      { new: true },
    )
      .populate('userId')
      .populate('hostelId')
      .populate('roomId')
      .populate({ path: 'parentId', populate: { path: 'userId' } });

    const obj = profile.toObject();
    obj.user = obj.userId;
    obj.hostel = obj.hostelId;
    obj.room = obj.roomId;
    if (obj.parentId) obj.parent = { ...obj.parentId, user: obj.parentId.userId };
    return obj;
  },

  async assignWardenHostel(wardenUserId, hostelId) {
    await profilesService.ensureProfile(wardenUserId);
    const user = await HostelUser.findById(wardenUserId);
    if (!user || user.role !== 'WARDEN') throw ApiError.badRequest('Not a warden');
    return HostelWardenProfile.findOneAndUpdate(
      { userId: wardenUserId },
      { hostelId },
      { new: true },
    );
  },
};
