import { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { s3Client } from '../config/s3';
import { env } from '../config/env';
import { logger } from '../utils/logger';

export const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; 

export interface UploadUrlResult {
  uploadUrl: string;
  imageKey: string;
  expiresIn: number;
  requiredHeaders: Record<string, string>;
}

export class S3Service {
  async generatePresignedUploadUrl(
    userId: string,
    fileName: string,
    fileType: string,
    fileSize?: number
  ): Promise<UploadUrlResult> {
    const normalizedFileType = fileType.toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.includes(normalizedFileType)) {
      throw new Error(`Invalid file type: ${fileType}. Only JPG, PNG, and WebP are allowed.`);
    }

    const ext = path.extname(fileName).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new Error(`Invalid file extension: ${ext}. Only .jpg, .jpeg, .png, and .webp are allowed.`);
    }

    if (fileSize !== undefined && fileSize > MAX_FILE_SIZE_BYTES) {
      throw new Error(`File size exceeds maximum allowed limit of 5 MB.`);
    }

    const sanitizedBase = path.basename(fileName, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const imageKey = `bugs/${userId}/${uuidv4()}-${sanitizedBase}${ext}`;
    const expiresIn = 300; 

    const command = new PutObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: imageKey,
      ContentType: normalizedFileType,
    });

    try {
      const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });

      logger.info('Generated pre-signed S3 upload URL', { userId, imageKey, fileType: normalizedFileType });

      return {
        uploadUrl,
        imageKey,
        expiresIn,
        requiredHeaders: {
          'Content-Type': normalizedFileType,
        },
      };
    } catch (err: any) {
      logger.error('Failed to generate pre-signed upload URL', err);
      throw new Error('Could not generate pre-signed upload URL. Please check AWS configuration.');
    }
  }

  async generatePresignedGetUrl(imageKey: string): Promise<string | null> {
    if (!imageKey) return null;

    const expiresIn = 900; 
    const command = new GetObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: imageKey,
    });

    try {
      const presignedUrl = await getSignedUrl(s3Client, command, { expiresIn });
      return presignedUrl;
    } catch (err: any) {
      logger.error('Failed to generate pre-signed GET URL for imageKey', { imageKey, err });
      return null;
    }
  }

  async deleteS3Object(imageKey: string): Promise<void> {
    if (!imageKey) return;

    const command = new DeleteObjectCommand({
      Bucket: env.AWS_S3_BUCKET,
      Key: imageKey,
    });

    try {
      await s3Client.send(command);
      logger.info('Deleted S3 object successfully', { imageKey });
    } catch (err: any) {
      logger.error('Failed to delete S3 object', { imageKey, error: err.message });
    }
  }

  async verifyObjectMetadata(imageKey: string): Promise<{ size: number; contentType: string } | null> {
    if (!imageKey) return null;

    try {
      const command = new HeadObjectCommand({
        Bucket: env.AWS_S3_BUCKET,
        Key: imageKey,
      });
      const response = await s3Client.send(command);
      return {
        size: response.ContentLength || 0,
        contentType: response.ContentType || '',
      };
    } catch (err: any) {
      logger.warn('Could not verify S3 object metadata (object may not be uploaded yet or S3 unconfigured)', { imageKey });
      return null;
    }
  }
}

export const s3Service = new S3Service();
