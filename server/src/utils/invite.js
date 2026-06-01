export function getInviteExpiryDays() {
  const days = parseInt(process.env.INVITE_EXPIRES_DAYS || '7', 10);
  return Number.isFinite(days) && days > 0 ? days : 7;
}

export function inviteExpiresAtFromNow() {
  const days = getInviteExpiryDays();
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function isInviteExpired(user) {
  if (user.inviteStatus === 'accepted' || user.inviteStatus === 'none') return false;
  if (!user.inviteExpiresAt) return false;
  return new Date() > new Date(user.inviteExpiresAt);
}

export function effectiveInviteStatus(user) {
  if (isInviteExpired(user)) return 'expired';
  return user.inviteStatus || 'none';
}
