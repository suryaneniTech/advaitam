import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';

export function auth(requiredRole) {
  return async (req, res, next) => {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    try {
      const token = header.slice(7);
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.userId).select('-password');

      if (!user) {
        return res.status(401).json({ message: 'User not found' });
      }

      if (requiredRole && user.role !== requiredRole) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }

      req.user = user;
      User.updateOne({ _id: user._id }, { lastActiveAt: new Date() }).catch(() => {});
      next();
    } catch {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  };
}
