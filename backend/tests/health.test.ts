import request from 'supertest';
import app from '../src/app';
import { setupTestDB, teardownTestDB } from './setup';

describe('Health Check API Test', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await teardownTestDB();
  });

  it('GET /api/health should return healthy status with uptime and database connected', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'healthy');
    expect(res.body).toHaveProperty('service', 'bug-tracker-lite-api');
    expect(res.body).toHaveProperty('uptimeSeconds');
    expect(typeof res.body.uptimeSeconds).toBe('number');
    expect(res.body).toHaveProperty('database');
    expect(res.body.database).toHaveProperty('status', 'connected');
    expect(res.body.database).toHaveProperty('connected', true);
    expect(res.body).toHaveProperty('timestamp');
  });
});
