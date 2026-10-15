import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { Bug, IBug } from '../models/Bug';
import { s3Service } from '../services/s3Service';
import { logger } from '../utils/logger';

export class BugController {

  async createBug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { title, description, severity, status, imageKey } = req.body;
      const userId = req.user!.userId;

      const bug = await Bug.create({
        userId: new mongoose.Types.ObjectId(userId),
        title,
        description,
        severity,
        status: status || 'open',
        imageKey: (imageKey && typeof imageKey === 'string' && imageKey.trim() !== '') ? imageKey.trim() : null,
      });

      let imageUrl = null;
      if (bug.imageKey) {
        imageUrl = await s3Service.generatePresignedGetUrl(bug.imageKey);
      }

      logger.info('Bug created successfully', { bugId: bug._id, userId });

      res.status(201).json({
        status: 'success',
        message: 'Bug created successfully',
        data: {
          bug: {
            ...bug.toJSON(),
            imageUrl,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async listBugs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const { status, search } = req.query;

      const query: any = { userId: new mongoose.Types.ObjectId(userId) };

      if (status && ['open', 'in-progress', 'closed'].includes(status as string)) {
        query.status = status;
      }

      if (search && typeof search === 'string') {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
        ];
      }

      const bugs = await Bug.find(query).sort({ createdAt: -1 });

      const bugsWithUrls = await Promise.all(
        bugs.map(async (b) => {
          const bugObj = b.toJSON();
          let imageUrl = null;
          if (b.imageKey) {
            imageUrl = await s3Service.generatePresignedGetUrl(b.imageKey);
          }
          return {
            ...bugObj,
            imageUrl,
          };
        })
      );

      res.status(200).json({
        status: 'success',
        results: bugsWithUrls.length,
        data: {
          bugs: bugsWithUrls,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async getBugById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          status: 'fail',
          code: 'INVALID_ID',
          message: 'Invalid bug ID format',
        });
        return;
      }

      const existingBug = await Bug.findById(id);
      if (!existingBug) {
        res.status(404).json({
          status: 'fail',
          code: 'NOT_FOUND',
          message: 'Bug not found',
        });
        return;
      }

      if (existingBug.userId.toString() !== userId) {
        res.status(403).json({
          status: 'fail',
          code: 'FORBIDDEN',
          message: 'Access denied. You do not have permission to view this bug.',
        });
        return;
      }

      let imageUrl = null;
      if (existingBug.imageKey) {
        imageUrl = await s3Service.generatePresignedGetUrl(existingBug.imageKey);
      }

      res.status(200).json({
        status: 'success',
        data: {
          bug: {
            ...existingBug.toJSON(),
            imageUrl,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async updateBug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const { title, description, severity, status, imageKey } = req.body;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          status: 'fail',
          code: 'INVALID_ID',
          message: 'Invalid bug ID format',
        });
        return;
      }

      const bug = await Bug.findById(id);
      if (!bug) {
        res.status(404).json({
          status: 'fail',
          code: 'NOT_FOUND',
          message: 'Bug not found',
        });
        return;
      }

      if (bug.userId.toString() !== userId) {
        res.status(403).json({
          status: 'fail',
          code: 'FORBIDDEN',
          message: 'Access denied. You do not have permission to edit this bug.',
        });
        return;
      }

      if (imageKey !== undefined && imageKey !== bug.imageKey) {
        if (bug.imageKey) {
          await s3Service.deleteS3Object(bug.imageKey);
        }
        bug.imageKey = (imageKey && typeof imageKey === 'string' && imageKey.trim() !== '') ? imageKey.trim() : null;
      }

      if (title !== undefined) bug.title = title;
      if (description !== undefined) bug.description = description;
      if (severity !== undefined) bug.severity = severity;
      if (status !== undefined) bug.status = status;

      await bug.save();

      let imageUrl = null;
      if (bug.imageKey) {
        imageUrl = await s3Service.generatePresignedGetUrl(bug.imageKey);
      }

      logger.info('Bug updated successfully', { bugId: bug._id, userId });

      res.status(200).json({
        status: 'success',
        message: 'Bug updated successfully',
        data: {
          bug: {
            ...bug.toJSON(),
            imageUrl,
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async deleteBug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          status: 'fail',
          code: 'INVALID_ID',
          message: 'Invalid bug ID format',
        });
        return;
      }

      const bug = await Bug.findById(id);
      if (!bug) {
        res.status(404).json({
          status: 'fail',
          code: 'NOT_FOUND',
          message: 'Bug not found',
        });
        return;
      }

      if (bug.userId.toString() !== userId) {
        res.status(403).json({
          status: 'fail',
          code: 'FORBIDDEN',
          message: 'Access denied. You do not have permission to delete this bug.',
        });
        return;
      }

      if (bug.imageKey) {
        await s3Service.deleteS3Object(bug.imageKey);
      }

      await Bug.deleteOne({ _id: id });

      logger.info('Bug deleted successfully', { bugId: id, userId });

      res.status(200).json({
        status: 'success',
        message: 'Bug deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}

export const bugController = new BugController();
