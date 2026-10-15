import request from 'supertest';
import app from '../src/app';
import { setupTestDB, clearTestDB, teardownTestDB } from './setup';

beforeAll(async () => {
  await setupTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

describe('Authentication Rate Limiting Tests', () => {
  it('should allow up to 5 attempts and return 429 on the 6th request', async () => {
    const payload = {
      email: 'ratelimit@example.com',
      password: 'SomePassword123',
    };

    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .set('x-test-rate-limit', 'true')
        .send(payload);
      expect(res.status).not.toBe(429);
    }

    const blockedRes = await request(app)
      .post('/api/auth/login')
      .set('x-test-rate-limit', 'true')
      .send(payload);
    expect(blockedRes.status).toBe(429);
    expect(blockedRes.body.code).toBe('RATE_LIMIT_EXCEEDED');
    expect(blockedRes.body.message).toContain('Too many authentication attempts');
  });
});
