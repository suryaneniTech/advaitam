import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export function getOtpExpiryMinutes() {
  const minutes = parseInt(process.env.OTP_EXPIRES_MINUTES || '10', 10);
  return Number.isFinite(minutes) && minutes > 0 ? minutes : 10;
}

export function generateOtpCode() {
  return String(crypto.randomInt(100000, 1000000));
}

export async function hashOtpCode(code) {
  return bcrypt.hash(code, 10);
}

export function compareOtpCode(code, hash) {
  return bcrypt.compare(code, hash);
}
