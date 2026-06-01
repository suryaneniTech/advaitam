import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { auth } from '../middleware/auth.js';
import { avatarUpload, deleteAvatarFile } from '../config/upload.js';
import { formatUser } from '../utils/user.js';
import { isInviteExpired } from '../utils/invite.js';

const router = Router();

function signToken(user) {
  return jwt.sign(
    { userId: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '30d' }
  );
}

router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ message: 'Invalid email address' });
  }

  const user = await User.findOne({ email: normalizedEmail });
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Invalid email or password' });
  }

  if (isInviteExpired(user)) {
    user.inviteStatus = 'expired';
    await user.save();
    return res.status(403).json({
      message: 'Invite has expired. Ask your admin to resend the invitation.',
    });
  }

  res.json({
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
