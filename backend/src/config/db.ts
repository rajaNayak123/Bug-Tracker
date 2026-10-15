import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

export async function connectDB(customUri?: string): Promise<void> {
  const uri = customUri || env.MONGODB_URI;

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true, 
    });

    logger.info('Connected successfully to MongoDB', { uri: uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@') });
  } catch (error) {
    logger.error('Failed to connect to MongoDB', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  }

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection runtime error', err);
  });

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB connection lost. Reconnecting...');
  });
}

export async function disconnectDB(): Promise<void> {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting MongoDB', error);
  }
}
