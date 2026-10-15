import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { authRoutes } from './routes/authRoutes';
import { bugRoutes } from './routes/bugRoutes';
import { getHealth } from './controllers/healthController';
import { swaggerRoute } from './swagger/swaggerRoute';
import { errorHandler } from './middleware/errorHandler';

const app: Application = express();

app.set('trust proxy', 1);

app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

const allowedOrigins = [
  env.CORS_ORIGIN,
  'http://localhost:3000',
  'http://localhost:5173',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5173',
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

app.get('/api/health', getHealth);

app.use('/api/docs', swaggerRoute);

app.use('/api/auth', authRoutes);
app.use('/api/bugs', bugRoutes);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    status: 'fail',
    code: 'ROUTE_NOT_FOUND',
    message: `Cannot ${req.method} ${req.originalUrl}`,
  });
});

app.use(errorHandler);

export default app;
