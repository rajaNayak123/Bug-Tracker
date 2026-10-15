import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface AppConfig {
  NODE_ENV: string;
  PORT: number;
  MONGODB_URI: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  AWS_REGION: string;
  AWS_S3_BUCKET: string;
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  CORS_ORIGIN: string;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX: number;
}

export function validateEnv(): AppConfig {
  const isProduction = process.env.NODE_ENV === 'production';

  const config: AppConfig = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT || '5001', 10),
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/bugtracker',
    JWT_SECRET: process.env.JWT_SECRET || (isProduction ? '' : 'dev_jwt_secret_change_in_production_12345'),
    JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1d',
    AWS_REGION: process.env.AWS_REGION || 'us-east-1',
    AWS_S3_BUCKET: process.env.AWS_S3_BUCKET || 'bug-tracker-lite-attachments',
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID || (isProduction ? '' : 'mock_access_key_for_dev_and_test'),
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY || (isProduction ? '' : 'mock_secret_key_for_dev_and_test_12345'),
    CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10), 
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '5', 10), 
  };

  if (isProduction && !process.env.JWT_SECRET) {
    throw new Error('FATAL: JWT_SECRET environment variable is required in production.');
  }

  if (isProduction && !process.env.MONGODB_URI) {
    throw new Error('FATAL: MONGODB_URI environment variable is required in production.');
  }

  return config;
}

export const env = validateEnv();
