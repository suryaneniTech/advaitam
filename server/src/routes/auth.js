import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { LoginOtp } from '../models/LoginOtp.js';
import { auth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { avatarUpload, deleteAvatarFile } from '../config/upload.js';
import { formatUser, generatePassword } from '../utils/user.js';
import { isInviteExpired } from '../utils/invite.js';
import { generateOtpCode, getOtpExpiryMinutes, hashOtpCode, compareOtpCode } from '../utils/otp.js';
import { sendOtpEmail } from '../services/mailer.js';

const router = Router();
const MAX_OTP_ATTEMPTS = 5;

function signToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
}

function normalizeEmail(email) {
  const normalized = email?.trim().toLowerCase();
  if (!normalized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return null;
  }
  return normalized;
}

function loginResponse(user, res) {
  if (isInviteExpired(user)) {
    user.inviteStatus = 'expired';
    return user.save().then(() =>
      res.status(403).json({
        message: 'Invite has expired. Ask your admin to resend the invitation.',
      })
    );
  }

  return res.json({
    token: signToken(user),
    user: formatUser(user),
  });
}

async function activateUserForOtp(user) {
  if (user.inviteStatus === 'sent' || user.inviteStatus === 'expired') {
    user.inviteStatus = 'accepted';
    user.inviteExpiresAt = null;
  }
  if (user.mustChangePassword) {
    user.mustChangePassword = false;
  }
  await user.save();
  return user;
}

async function findOrCreateUserForOtp(email) {
  const existing = await User.findOne({ email });
  if (existing) {
    return activateUserForOtp(existing);
  }

  try {
    return await User.create({
      email,
      password: generatePassword(),
      role: 'user',
      inviteStatus: 'none',
      mustChangePassword: false,
    });
  } catch (err) {
    if (err.code === 11000) {
      const user = await User.findOne({ email });
      if (user) return activateUserForOtp(user);
    }
    throw err;
  }
}

const otpSendLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyFn: (req) => `otp-send:${normalizeEmail(req.body?.email) || req.ip}`,
});

const otpVerifyLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyFn: (req) => `otp-verify:${normalizeEmail(req.body?.email) || req.ip}`,
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return res.status(400).json({ message: 'Invalid email address' });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  return loginResponse(user, res);
});

router.post('/otp/send', otpSendLimit, async (req, res) => {
  const normalizedEmail = normalizeEmail(req.body?.email);
  if (!normalizedEmail) {
    return res.status(400).json({ message: 'Invalid email address' });
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return res.status(503).json({
      message: 'Email login is not available. Ask your admin to configure Gmail.',
    });
  }

  const code = generateOtpCode();
  const expiresMinutes = getOtpExpiryMinutes();
  const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

  await LoginOtp.findOneAndUpdate(
    { email: normalizedEmail },
    {
      codeHash: await hashOtpCode(code),
      attempts: 0,
      expiresAt,
    },
    { upsert: true, new: true }
  );

  try {
    await sendOtpEmail({ to: normalizedEmail, code, expiresMinutes });
  } catch (err) {
    await LoginOtp.deleteOne({ email: normalizedEmail });
    return res.status(503).json({ message: err.message });
  }

  res.json({
    message: 'Sign-in code sent to your email',
    expiresMinutes,
  });
});

router.post('/otp/verify', otpVerifyLimit, async (req, res) => {
  const { email, otp } = req.body;
  const normalizedEmail = normalizeEmail(email);
  const code = String(otp || '').trim();

  if (!normalizedEmail || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ message: 'Valid email and 6-digit code are required' });
  }

  const otpRecord = await LoginOtp.findOne({ email: normalizedEmail });
  if (!otpRecord || otpRecord.expiresAt <= new Date()) {
    return res.status(401).json({ message: 'Invalid or expired code' });
  }

  if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
    await LoginOtp.deleteOne({ email: normalizedEmail });
    return res.status(429).json({ message: 'Too many attempts. Request a new code.' });
  }

  const valid = await compareOtpCode(code, otpRecord.codeHash);
  if (!valid) {
    otpRecord.attempts += 1;
    await otpRecord.save();
    return res.status(401).json({ message: 'Invalid or expired code' });
  }

  await LoginOtp.deleteOne({ email: normalizedEmail });

  const user = await findOrCreateUserForOtp(normalizedEmail);
  if (!user) {
    return res.status(500).json({ message: 'Could not create account. Please try again.' });
  }

  return res.json({
    token: signToken(user),
    user: formatUser(user),
  });
});

router.get('/me', auth(), (req, res) => {
  res.json({ user: formatUser(req.user) });
});

router.post('/me/avatar', auth(), (req, res, next) => {
  avatarUpload.single('avatar')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ message: err.message || 'Upload failed' });
    }
    next();
  });
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No image uploaded' });
  }

  const user = await User.findById(req.user._id);
  if (user.profileImage && user.profileImage !== `/uploads/avatars/${req.file.filename}`) {
    deleteAvatarFile(user.profileImage);
  }

  user.profileImage = `/uploads/avatars/${req.file.filename}`;
  await user.save();

  res.json({ message: 'Profile photo updated', user: formatUser(user) });
});

router.delete('/me/avatar', auth(), async (req, res) => {
  const user = await User.findById(req.user._id);

  if (user.profileImage) {
    deleteAvatarFile(user.profileImage);
    user.profileImage = null;
    await user.save();
  }

  res.json({ message: 'Profile photo removed', user: formatUser(user) });
});

router.post('/change-password', auth(), async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Current and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'New password must be at least 6 characters' });
  }

  const user = await User.findById(req.user._id);
  if (!(await user.comparePassword(currentPassword))) {
    return res.status(401).json({ message: 'Current password is incorrect' });
  }

  user.password = newPassword;
  user.mustChangePassword = false;
  if (user.inviteStatus === 'sent') {
    user.inviteStatus = 'accepted';
  }
  await user.save();

  res.json({
    message: 'Password updated',
    user: formatUser(user),
  });
});

export default router;
