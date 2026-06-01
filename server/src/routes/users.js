import { Router } from 'express';
import { User } from '../models/User.js';
import { auth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { sendInviteEmail, sendTestEmail } from '../services/mailer.js';
import { generatePassword, formatUser } from '../utils/user.js';
import { inviteExpiresAtFromNow } from '../utils/invite.js';

const router = Router();
const inviteLimiter = rateLimit({ windowMs: 60 * 60 * 1000, max: 20 });

router.use(auth('admin'));

router.get('/', async (_req, res) => {
  const users = await User.find({ role: 'user' })
    .select('-password')
    .sort({ createdAt: -1 });
  res.json({ users: users.map(formatUser) });
});

router.post('/test-email', inviteLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email?.trim()) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ message: 'Invalid email address' });
  }

  try {
    await sendTestEmail(normalizedEmail);
  } catch (err) {
    console.error('Test email failed:', err.message);
    return res.status(502).json({ message: err.message });
  }

  res.json({ message: `Test email sent to ${normalizedEmail}` });
});

router.post('/', async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ message: 'Invalid email address' });
  }

  const existing = await User.findOne({ email: normalizedEmail });
  if (existing) {
    return res.status(409).json({ message: 'A user with this email already exists' });
  }

  const user = await User.create({
    email: normalizedEmail,
    password,
    role: 'user',
    createdBy: req.user._id,
  });

  res.status(201).json({
    user: formatUser(user),
    credentials: {
      email: user.email,
      password,
    },
  });
});

router.post('/invite', inviteLimiter, async (req, res) => {
  const { email } = req.body;

  if (!email?.trim()) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({ message: 'Invalid email address' });
  }

  const existingEmail = await User.findOne({ email: normalizedEmail });
  if (existingEmail) {
    return res.status(409).json({ message: 'A user with this email already exists' });
  }

  const tempPassword = generatePassword();
  const inviteExpiresAt = inviteExpiresAtFromNow();

  const user = await User.create({
    email: normalizedEmail,
    password: tempPassword,
    role: 'user',
    mustChangePassword: true,
    inviteStatus: 'sent',
    invitedAt: new Date(),
    inviteExpiresAt,
    createdBy: req.user._id,
  });

  try {
    await sendInviteEmail({
      to: normalizedEmail,
      tempPassword,
      expiresAt: inviteExpiresAt,
    });
  } catch (err) {
    await user.deleteOne();
    console.error('Invite email failed:', err.message);
    return res.status(502).json({ message: err.message });
  }

  res.status(201).json({
    message: `Invite sent to ${normalizedEmail}`,
    user: formatUser(user),
  });
});

router.post('/:id/resend-invite', inviteLimiter, async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'user' });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  if (user.inviteStatus === 'accepted') {
    return res.status(400).json({ message: 'User has already accepted their invite' });
  }

  const tempPassword = generatePassword();
  const inviteExpiresAt = inviteExpiresAtFromNow();

  user.password = tempPassword;
  user.mustChangePassword = true;
  user.inviteStatus = 'sent';
  user.invitedAt = new Date();
  user.inviteExpiresAt = inviteExpiresAt;
  await user.save();

  try {
    await sendInviteEmail({
      to: user.email,
      tempPassword,
      expiresAt: inviteExpiresAt,
    });
  } catch (err) {
    console.error('Resend invite failed:', err.message);
    return res.status(502).json({ message: err.message });
  }

  res.json({
    message: `Invite resent to ${user.email}`,
    user: formatUser(user),
  });
});

router.delete('/:id', async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'user' });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  await user.deleteOne();
  res.json({ message: 'User deleted' });
});

export default router;
