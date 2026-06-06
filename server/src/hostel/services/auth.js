import { HostelUser, HostelRefreshToken } from '../../models/hostel/index.js';
import { ApiError, hashPassword, verifyPassword, publicUser } from '../lib/security.js';
import {
  signAccessToken,
  generateRefreshToken,
  hashToken,
  refreshTokenExpiry,
} from '../lib/tokens.js';

async function issueTokens(user, ctx) {
  const accessToken = signAccessToken({
    sub: user.id,
    role: user.role,
    collegeId: user.collegeId ? user.collegeId.toString() : null,
  });

  const refreshToken = generateRefreshToken();
  await HostelRefreshToken.create({
    userId: user._id,
    tokenHash: hashToken(refreshToken),
    expiresAt: refreshTokenExpiry(),
    ip: ctx.ip,
    userAgent: ctx.userAgent,
  });

  return { accessToken, refreshToken };
}

export const authService = {
  async login(email, password, ctx) {
    const user = await HostelUser.findOne({ email: email.toLowerCase() });
    if (!user || !user.isActive) throw ApiError.unauthorized('Invalid credentials');
    if (!user.passwordHash) {
      throw ApiError.badRequest('This account uses Google Sign-In. Continue with Google.');
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) throw ApiError.unauthorized('Invalid credentials');

    user.lastLoginAt = new Date();
    await user.save();

    const tokens = await issueTokens(user, ctx);
    return { user: publicUser(user), ...tokens };
  },

  async refresh(presentedToken, ctx) {
    const tokenHash = hashToken(presentedToken);
    const record = await HostelRefreshToken.findOne({ tokenHash });

    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw ApiError.unauthorized('Invalid refresh token');
    }

    const user = await HostelUser.findById(record.userId);
    if (!user) throw ApiError.unauthorized('Invalid refresh token');

    record.revokedAt = new Date();
    await record.save();
    const tokens = await issueTokens(user, ctx);
    return { user: publicUser(user), ...tokens };
  },

  async logout(presentedToken) {
    const tokenHash = hashToken(presentedToken);
    await HostelRefreshToken.updateMany(
      { tokenHash, revokedAt: null },
      { revokedAt: new Date() },
    );
  },

  async me(userId) {
    const user = await HostelUser.findById(userId);
    if (!user) throw ApiError.notFound('User not found');
    return publicUser(user);
  },

  async changePassword(userId, currentPassword, newPassword) {
    const user = await HostelUser.findById(userId);
    if (!user?.passwordHash) throw ApiError.badRequest('No password set for this account');

    const ok = await verifyPassword(currentPassword, user.passwordHash);
    if (!ok) throw ApiError.unauthorized('Current password is incorrect');

    user.passwordHash = await hashPassword(newPassword);
    user.mustChangePassword = false;
    await user.save();

    await HostelRefreshToken.updateMany(
      { userId: user._id, revokedAt: null },
      { revokedAt: new Date() },
    );
  },
};
