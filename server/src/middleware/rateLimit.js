const hits = new Map();

export function rateLimit({ windowMs = 60 * 60 * 1000, max = 20 } = {}) {
  return (req, res, next) => {
    const key = req.user?._id?.toString() || req.ip;
    const now = Date.now();

    let entry = hits.get(key);
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count += 1;
    if (entry.count > max) {
      return res.status(429).json({
        message: 'Too many requests. Please wait before trying again.',
      });
    }

    next();
  };
}
