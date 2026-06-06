import { verifyAccessToken } from '../lib/tokens.js';
import { ApiError } from '../lib/security.js';

export function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('Missing bearer token'));
  }
  try {
    req.hostelUser = verifyAccessToken(header.slice('Bearer '.length));
    return next();
  } catch {
    return next(ApiError.unauthorized('Invalid or expired token'));
  }
}

export function requireRoles(...roles) {
  return (req, _res, next) => {
    if (!req.hostelUser) return next(ApiError.unauthorized());
    if (!roles.includes(req.hostelUser.role)) {
      return next(ApiError.forbidden('Insufficient role'));
    }
    return next();
  };
}
