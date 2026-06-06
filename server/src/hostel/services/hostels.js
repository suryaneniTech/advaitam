import {
  HostelCollege,
  HostelBuilding,
  HostelRoom,
  HostelStudentProfile,
  HostelUser,
} from '../../models/hostel/index.js';
import { ApiError } from '../lib/security.js';

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

function assertTimeWindow(start, end) {
  if (start && !HHMM.test(start)) throw ApiError.badRequest('attendanceStart must be HH:mm');
  if (end && !HHMM.test(end)) throw ApiError.badRequest('attendanceEnd must be HH:mm');
}

function assertGeo(lat, lng, radius) {
  if (lat !== undefined && (lat < -90 || lat > 90)) throw ApiError.badRequest('latitude out of range');
  if (lng !== undefined && (lng < -180 || lng > 180)) throw ApiError.badRequest('longitude out of range');
  if (radius !== undefined && radius < 10) throw ApiError.badRequest('radiusMeters must be >= 10');
}

function assertCollegeScope(requesterCollegeId, targetCollegeId) {
  if (requesterCollegeId && requesterCollegeId !== targetCollegeId.toString()) {
    throw ApiError.forbidden('Resource belongs to another college');
  }
}

async function countForCollege(collegeId) {
  const [hostels, users] = await Promise.all([
    HostelBuilding.countDocuments({ collegeId }),
    HostelUser.countDocuments({ collegeId }),
  ]);
  return { hostels, users };
}

export const collegesService = {
  async list(requesterCollegeId) {
    const filter = requesterCollegeId ? { _id: requesterCollegeId } : {};
    const colleges = await HostelCollege.find(filter).sort({ name: 1 }).lean();
    const result = [];
    for (const c of colleges) {
      const _count = await countForCollege(c._id);
      result.push({ ...c, id: c._id.toString(), _count });
    }
    return result;
  },

  async create(input) {
    const existing = await HostelCollege.findOne({ code: input.code.toLowerCase() });
    if (existing) throw ApiError.conflict('A college with this code already exists');
    return HostelCollege.create(input);
  },

  async update(id, requesterCollegeId, patch) {
    assertCollegeScope(requesterCollegeId, id);
    return HostelCollege.findByIdAndUpdate(id, patch, { new: true });
  },
};

export const hostelsService = {
  async list(requesterCollegeId, collegeId) {
    const filter = requesterCollegeId
      ? { collegeId: requesterCollegeId }
      : collegeId
        ? { collegeId }
        : {};
    const hostels = await HostelBuilding.find(filter).sort({ name: 1 });
    const result = [];
    for (const h of hostels) {
      const [rooms, students] = await Promise.all([
        HostelRoom.countDocuments({ hostelId: h._id }),
        HostelStudentProfile.countDocuments({ hostelId: h._id }),
      ]);
      const obj = h.toObject();
      obj._count = { rooms, students };
      result.push(obj);
    }
    return result;
  },

  async getById(id, requesterCollegeId) {
    const hostel = await HostelBuilding.findById(id);
    if (!hostel) throw ApiError.notFound('Hostel not found');
    assertCollegeScope(requesterCollegeId, hostel.collegeId);
    const [rooms, students] = await Promise.all([
      HostelRoom.find({ hostelId: id }).sort({ number: 1 }),
      HostelStudentProfile.countDocuments({ hostelId: id }),
    ]);
    const obj = hostel.toObject();
    obj.rooms = rooms.map((r) => r.toObject());
    obj._count = { students };
    return obj;
  },

  async create(requesterCollegeId, input) {
    assertCollegeScope(requesterCollegeId, input.collegeId);
    assertGeo(input.latitude, input.longitude, input.radiusMeters);
    assertTimeWindow(input.attendanceStart, input.attendanceEnd);

    const college = await HostelCollege.findById(input.collegeId);
    if (!college) throw ApiError.badRequest('collegeId does not exist');

    return HostelBuilding.create(input);
  },

  async update(id, requesterCollegeId, patch) {
    await hostelsService.getById(id, requesterCollegeId);
    assertGeo(patch.latitude, patch.longitude, patch.radiusMeters);
    assertTimeWindow(patch.attendanceStart, patch.attendanceEnd);
    return HostelBuilding.findByIdAndUpdate(id, patch, { new: true });
  },

  async remove(id, requesterCollegeId) {
    await hostelsService.getById(id, requesterCollegeId);
    await HostelRoom.deleteMany({ hostelId: id });
    await HostelBuilding.findByIdAndDelete(id);
  },
};

export const roomsService = {
  async create(requesterCollegeId, input) {
    await hostelsService.getById(input.hostelId, requesterCollegeId);
    const dup = await HostelRoom.findOne({ hostelId: input.hostelId, number: input.number });
    if (dup) throw ApiError.conflict('A room with this number already exists in the hostel');
    return HostelRoom.create(input);
  },

  async remove(id, requesterCollegeId) {
    const room = await HostelRoom.findById(id);
    if (!room) throw ApiError.notFound('Room not found');
    const hostel = await HostelBuilding.findById(room.hostelId);
    assertCollegeScope(requesterCollegeId, hostel.collegeId);
    await HostelRoom.findByIdAndDelete(id);
  },
};
