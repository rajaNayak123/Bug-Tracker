import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const authRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  statusCode: 429,
  message: {
    status: 'error',
    code: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many authentication attempts from this IP address. Please try again after 1 minute.',
  },
  skip: (req) => {
    if (process.env.NODE_ENV === 'test') {
      return req.headers['x-test-rate-limit'] !== 'true';
    }
    return false;
  },
});
