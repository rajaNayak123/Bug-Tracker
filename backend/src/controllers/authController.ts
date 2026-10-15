import { Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export class AuthController {

  async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      const existingUser = await User.findOne({ email: normalizedEmail });
      if (existingUser) {
        res.status(409).json({
          status: 'fail',
          code: 'EMAIL_ALREADY_EXISTS',
          message: 'An account with this email address already exists.',
        });
        return;
      }

      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash(password, salt);

      const user = await User.create({
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        createdAt: new Date(),
      });

      const token = jwt.sign(
        { userId: user._id.toString(), email: user.email, name: user.name },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN as any }
      );

      logger.info('User successfully registered', { userId: user._id, email: user.email });

      res.status(201).json({
        status: 'success',
        message: 'Account created successfully',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password } = req.body;
      const normalizedEmail = email.toLowerCase().trim();

      const user = await User.findOne({ email: normalizedEmail });
      if (!user) {
        res.status(401).json({
          status: 'fail',
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        });
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        res.status(401).json({
          status: 'fail',
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        });
        return;
      }

      const token = jwt.sign(
        { userId: user._id.toString(), email: user.email, name: user.name },
        env.JWT_SECRET,
        { expiresIn: env.JWT_EXPIRES_IN as any }
      );

      logger.info('User logged in successfully', { userId: user._id, email: user.email });

      res.status(200).json({
        status: 'success',
        message: 'Logged in successfully',
        data: {
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            createdAt: user.createdAt,
          },
          token,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = await User.findById(req.user?.userId).select('-password');
      if (!user) {
        res.status(404).json({
          status: 'fail',
          code: 'USER_NOT_FOUND',
          message: 'User profile not found.',
        });
        return;
      }

      res.status(200).json({
        status: 'success',
        data: { user },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
