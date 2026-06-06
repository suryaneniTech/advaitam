import { ApiError } from '../lib/security.js';

export function hostelErrorHandler(err, _req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message, details: err.details });
  }

  if (err?.code === 11000) {
    return res.status(409).json({ error: 'Resource already exists' });
  }

  console.error('Hostel unhandled error:', err);
  const isProd = process.env.NODE_ENV === 'production';
  return res.status(500).json({
    error: 'Internal server error',
    ...(isProd ? {} : { detail: err instanceof Error ? err.message : String(err) }),
  });
}
