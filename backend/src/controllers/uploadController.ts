import { Request, Response, NextFunction } from 'express';
import { s3Service } from '../services/s3Service';

export class UploadController {
  async getUploadUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { fileName, fileType, fileSize } = req.body;
      const userId = req.user!.userId;

      const result = await s3Service.generatePresignedUploadUrl(
        userId,
        fileName,
        fileType,
        fileSize
      );

      res.status(200).json({
        status: 'success',
        message: 'Pre-signed S3 upload URL generated successfully',
        data: result,
      });
    } catch (error: any) {
      res.status(400).json({
        status: 'fail',
        code: 'UPLOAD_URL_ERROR',
        message: error.message || 'Failed to generate pre-signed upload URL',
      });
    }
  }
}

export const uploadController = new UploadController();
