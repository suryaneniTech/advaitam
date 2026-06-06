import { Router } from 'express';
import { authService } from '../services/auth.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();
const REFRESH_COOKIE = 'hostel_refresh_token';
const isProd = process.env.NODE_ENV === 'production';
const REFRESH_TTL_DAYS = Number(process.env.HOSTEL_JWT_REFRESH_TTL_DAYS || 30);

const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict',
  path: '/hostel-api/auth',
  maxAge: REFRESH_TTL_DAYS * 24 * 60 * 60 * 1000,
};

function ctxFrom(req) {
  return { ip: req.ip, userAgent: req.headers['user-agent'] };
}

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    const { user, accessToken, refreshToken } = await authService.login(email, password, ctxFrom(req));
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    res.json({ user, accessToken });
  } catch (err) {
    next(err);
  }
});

router.post('/refresh', async (req, res, next) => {
  try {
    const presented = req.cookies?.[REFRESH_COOKIE];
    if (!presented) return res.status(401).json({ error: 'No refresh token' });
    const { user, accessToken, refreshToken } = await authService.refresh(presented, ctxFrom(req));
    res.cookie(REFRESH_COOKIE, refreshToken, cookieOptions);
    res.json({ user, accessToken });
  } catch (err) {
    next(err);
  }
});

router.post('/logout', async (req, res, next) => {
  try {
    const presented = req.cookies?.[REFRESH_COOKIE];
    if (presented) await authService.logout(presented);
    res.clearCookie(REFRESH_COOKIE, { ...cookieOptions, maxAge: undefined });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

router.get('/me', authenticate, async (req, res, next) => {
  try {
    res.json({ user: await authService.me(req.hostelUser.sub) });
  } catch (err) {
    next(err);
  }
});

router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return res.status(400).json({ error: 'Valid current and new password (min 8 chars) required' });
    }
    await authService.changePassword(req.hostelUser.sub, currentPassword, newPassword);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;
