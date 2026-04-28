import type { NextFunction, Request, Response } from 'express';

type RateLimitOptions = {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
};

export function createRateLimitMiddleware(options: RateLimitOptions) {
  const windowMs = options.windowMs;
  const max = options.max;
  const keyGenerator =
    options.keyGenerator ??
    ((req) => {
      const forwardedFor = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim();
      return forwardedFor || req.ip || req.socket.remoteAddress || 'unknown';
    });

  const hits = new Map<string, { count: number; resetAt: number }>();

  return function rateLimit(req: Request, res: Response, next: NextFunction) {
    const now = Date.now();
    const key = keyGenerator(req) || 'unknown';
    const existing = hits.get(key);

    if (!existing || existing.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    existing.count += 1;
    if (existing.count <= max) return next();

    const retryAfterSeconds = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
    res.setHeader('Retry-After', String(retryAfterSeconds));
    return res.status(429).json({
      statusCode: 429,
      success: false,
      message: 'Too many requests',
    });
  };
}
