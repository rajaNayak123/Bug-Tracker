import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { setupTestDB, clearTestDB, teardownTestDB } from './setup';
import { User } from '../src/models/User';
import { env } from '../src/config/env';

beforeAll(async () => {
  await setupTestDB();
});

afterEach(async () => {
  await clearTestDB();
});

afterAll(async () => {
  await teardownTestDB();
});

describe('Authentication API Tests', () => {
  describe('POST /api/auth/signup', () => {
    it('should register a new user successfully and hash the password', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Alice Developer',
          email: 'alice@example.com',
          password: 'Password123!',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.name).toBe('Alice Developer');
      expect(res.body.data.user.email).toBe('alice@example.com');
      expect(res.body.data.user.password).toBeUndefined(); 
      expect(res.body.data.token).toBeDefined();

      const savedUser = await User.findOne({ email: 'alice@example.com' });
      expect(savedUser).not.toBeNull();
      expect(savedUser!.password).not.toBe('Password123!');
      expect(savedUser!.password.startsWith('$2')).toBe(true);
    });

    it('should prevent duplicate email registration (case-insensitive)', async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'First User',
          email: 'test@example.com',
          password: 'Password123!',
        });

      const duplicateRes = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Second User',
          email: 'TEST@example.com',
          password: 'Password456!',
        });

      expect(duplicateRes.status).toBe(409);
      expect(duplicateRes.body.code).toBe('EMAIL_ALREADY_EXISTS');
    });

    it('should reject invalid email format and short password', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'A',
          email: 'not-an-email',
          password: '123',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
      expect(res.body.errors.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/auth/signup')
        .send({
          name: 'Bob Tester',
          email: 'bob@example.com',
          password: 'ValidPassword123',
        });
    });

    it('should log in successfully with valid credentials and return JWT', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'bob@example.com',
          password: 'ValidPassword123',
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.email).toBe('bob@example.com');
      expect(res.body.data.user.password).toBeUndefined();
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'bob@example.com',
          password: 'WrongPassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('should reject non-existent user email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nobody@example.com',
          password: 'SomePassword123',
        });

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('JWT Middleware & Authentication Protection', () => {
    it('should reject requests with missing token', async () => {
      const res = await request(app).get('/api/bugs');
      expect(res.status).toBe(401);
      expect(res.body.message).toContain('Missing or malformed');
    });

    it('should reject requests with invalid token signature', async () => {
      const res = await request(app)
        .get('/api/bugs')
        .set('Authorization', 'Bearer invalid.token.value');

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('INVALID_TOKEN');
    });

    it('should reject expired JWT tokens', async () => {
      const expiredToken = jwt.sign(
        { userId: '123456789012345678901234', email: 'expired@test.com', name: 'Expired' },
        env.JWT_SECRET,
        { expiresIn: -10 as any } 
      );

      const res = await request(app)
        .get('/api/bugs')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('TOKEN_EXPIRED');
    });
  });
});
