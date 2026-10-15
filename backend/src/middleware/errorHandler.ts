import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export class AppError extends Error {
  public statusCode: number;
  public code?: string;

  constructor(message: string, statusCode: number, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}

export function errorHandler(
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error(`Error processing ${req.method} ${req.url}`, err);

  if (err.name === 'CastError') {
    res.status(400).json({
      status: 'fail',
      code: 'INVALID_ID',
      message: `Invalid format for field '${err.path}': ${err.value}`,
    });
    return;
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    res.status(409).json({
      status: 'fail',
      code: 'DUPLICATE_ENTRY',
      message: `A record with this ${field} already exists.`,
    });
    return;
  }

  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((val: any) => val.message);
    res.status(400).json({
      status: 'fail',
      code: 'VALIDATION_ERROR',
      message: 'Database validation failed',
      errors: messages,
    });
    return;
  }

  if (err.name === 'JsonWebTokenError') {
    res.status(401).json({
      status: 'error',
      code: 'INVALID_TOKEN',
      message: 'Invalid authentication token.',
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    res.status(401).json({
      status: 'error',
      code: 'TOKEN_EXPIRED',
      message: 'Authentication token has expired. Please log in again.',
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      status: err.statusCode >= 500 ? 'error' : 'fail',
      code: err.code || 'APP_ERROR',
      message: err.message,
    });
    return;
  }

  const statusCode = err.status || err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  res.status(statusCode).json({
    status: 'error',
    code: 'INTERNAL_SERVER_ERROR',
    message: isProd ? 'An unexpected error occurred. Please try again later.' : (err.message || 'Internal Server Error'),
    ...(isProd ? {} : { stack: err.stack }),
  });
}
