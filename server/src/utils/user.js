import crypto from 'crypto';
import { effectiveInviteStatus, isInviteExpired } from './invite.js';

export function generatePassword(length = 12) {
  const chars = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let pwd = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    pwd += chars[bytes[i] % chars.length];
  }
  return pwd;
}

export function displayName(email) {
  return email?.split('@')[0] || email;
}

export function getInitial(email) {
  const local = email?.split('@')[0]?.trim();
  if (!local) return '?';
  return local.charAt(0).toUpperCase();
}

export function formatUser(user) {
  const inviteStatus = effectiveInviteStatus(user);
  return {
    id: user._id,
    email: user.email,
    role: user.role,
    profileImage: user.profileImage || null,
    initial: getInitial(user.email),
    inviteStatus,
    mustChangePassword: user.mustChangePassword,
    invitedAt: user.invitedAt,
    inviteExpiresAt: user.inviteExpiresAt,
    inviteExpired: isInviteExpired(user),
    createdAt: user.createdAt,
  };
}
