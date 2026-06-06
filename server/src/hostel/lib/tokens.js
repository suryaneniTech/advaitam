import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

const ACCESS_SECRET = process.env.HOSTEL_JWT_ACCESS_SECRET || `${process.env.JWT_SECRET}-hostel-access`;
const REFRESH_TTL_DAYS = Number(process.env.HOSTEL_JWT_REFRESH_TTL_DAYS || 30);
const ACCESS_TTL = process.env.HOSTEL_JWT_ACCESS_TTL || '15m';

export function signAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_TTL });
}

export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

export function generateRefreshToken() {
  return crypto.randomBytes(48).toString('base64url');
}

export function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function refreshTokenExpiry() {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_TTL_DAYS);
  return d;
}
