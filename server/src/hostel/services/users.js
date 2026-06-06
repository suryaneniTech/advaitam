import crypto from 'node:crypto';
import {
  HostelUser,
  HostelStudentProfile,
  HostelParentProfile,
  HostelWardenProfile,
  HostelRefreshToken,
} from '../../models/hostel/index.js';
import { ApiError, hashPassword, publicUser } from '../lib/security.js';

function generateTempPassword() {
  return crypto.randomBytes(6).toString('base64url').slice(0, 9) + '7!';
}

export const usersService = {
  async list({ requesterCollegeId, role, search, page, pageSize }) {
    const filter = {};
    if (requesterCollegeId) filter.collegeId = requesterCollegeId;
    if (role) filter.role = role;
    if (search) {
      const re = new RegExp(search, 'i');
      filter.$or = [{ name: re }, { email: re }];
    }

    const [items, total] = await Promise.all([
      HostelUser.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize),
      HostelUser.countDocuments(filter),
    ]);

    return {
      items: items.map(publicUser),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    };
  },

  async getById(id, requesterCollegeId) {
    const user = await HostelUser.findById(id);
    if (!user) throw ApiError.notFound('User not found');
    if (requesterCollegeId && user.collegeId?.toString() !== requesterCollegeId) {
      throw ApiError.forbidden('User belongs to another college');
    }
    return publicUser(user);
  },

  async create(input) {
    const existing = await HostelUser.findOne({ email: input.email.toLowerCase() });
    if (existing) throw ApiError.conflict('A user with this email already exists');

    const tempPassword = input.password ?? generateTempPassword();
    const user = await HostelUser.create({
      email: input.email.toLowerCase(),
      name: input.name,
      role: input.role,
      phone: input.phone,
      collegeId: input.collegeId,
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: !input.password,
    });

    if (input.role === 'STUDENT') {
      await HostelStudentProfile.create({
        userId: user._id,
        rollNumber: `TEMP-${user.id.slice(-6)}`,
      });
    } else if (input.role === 'PARENT') {
      await HostelParentProfile.create({ userId: user._id });
    } else if (input.role === 'WARDEN') {
      await HostelWardenProfile.create({ userId: user._id });
    }

    return {
      user: publicUser(user),
      tempPassword: input.password ? undefined : tempPassword,
    };
  },

  async update(id, requesterCollegeId, patch) {
    await usersService.getById(id, requesterCollegeId);
    const user = await HostelUser.findByIdAndUpdate(id, patch, { new: true });
    return publicUser(user);
  },

  async deactivate(id, requesterCollegeId) {
    await usersService.getById(id, requesterCollegeId);
    const user = await HostelUser.findByIdAndUpdate(id, { isActive: false }, { new: true });
    await HostelRefreshToken.updateMany(
      { userId: user._id, revokedAt: null },
      { revokedAt: new Date() },
    );
    return publicUser(user);
  },

  async resetPassword(id, requesterCollegeId) {
    await usersService.getById(id, requesterCollegeId);
    const tempPassword = generateTempPassword();
    await HostelUser.findByIdAndUpdate(id, {
      passwordHash: await hashPassword(tempPassword),
      mustChangePassword: true,
    });
    await HostelRefreshToken.updateMany(
      { userId: id, revokedAt: null },
      { revokedAt: new Date() },
    );
    return { tempPassword };
  },
};
