import { MongoMemoryServer } from 'mongodb-memory-server';
import app from './app';
import { env } from './config/env';
import { connectDB, disconnectDB } from './config/db';
import { logger } from './utils/logger';

async function bootstrapDev() {
  logger.info('Starting Bug Tracker Lite in self-contained developer mode with embedded MongoDB...');

  const mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  logger.info(`Embedded MongoDB Memory Server started at ${uri}`);

  await connectDB(uri);

  const server = app.listen(env.PORT, () => {
    logger.info(`====================================================`);
    logger.info(` Bug Tracker Lite Backend is LIVE on port ${env.PORT}`);
    logger.info(` Environment: ${env.NODE_ENV}`);
    logger.info(` REST API: http://localhost:${env.PORT}/api`);
    logger.info(` API Docs (Swagger): http://localhost:${env.PORT}/api/docs`);
    logger.info(` Health Check: http://localhost:${env.PORT}/api/health`);
    logger.info(`====================================================`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}. Shutting down dev server...`);
    server.close(async () => {
      await disconnectDB();
      await mongoServer.stop();
      logger.info('Dev server and database stopped. Exiting.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrapDev().catch((err) => {
  logger.error('Failed to start dev server', err);
  process.exit(1);
});
