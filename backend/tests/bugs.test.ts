import request from 'supertest';
import app from '../src/app';
import { setupTestDB, clearTestDB, teardownTestDB } from './setup';
import { Bug } from '../src/models/Bug';
import { s3Service } from '../src/services/s3Service';

jest.spyOn(s3Service, 'generatePresignedGetUrl').mockImplementation(async (key: string) => {
  return `https://s3.amazonaws.com/test-bucket/${key}?mock-signature=123`;
});
const deleteS3Spy = jest.spyOn(s3Service, 'deleteS3Object').mockImplementation(async () => {});

let tokenUserA: string;
let userAId: string;
let tokenUserB: string;
let userBId: string;

beforeAll(async () => {
  await setupTestDB();
});

beforeEach(async () => {
  await clearTestDB();
  deleteS3Spy.mockClear();

  const resA = await request(app).post('/api/auth/signup').send({
    name: 'User A',
    email: 'userA@example.com',
    password: 'Password123',
  });
  tokenUserA = resA.body.data.token;
  userAId = resA.body.data.user.id;

  const resB = await request(app).post('/api/auth/signup').send({
    name: 'User B',
    email: 'userB@example.com',
    password: 'Password123',
  });
  tokenUserB = resB.body.data.token;
  userBId = resB.body.data.user.id;
});

afterAll(async () => {
  await teardownTestDB();
});

describe('Bug Management API Tests', () => {
  describe('POST /api/bugs', () => {
    it('should create a new bug bound to the authenticated user', async () => {
      const res = await request(app)
        .post('/api/bugs')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'Crash on clicking save',
          description: 'Application encounters unhandled promise rejection',
          severity: 'high',
          status: 'open',
          imageKey: 'bugs/test/screenshot.png',
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.bug.title).toBe('Crash on clicking save');
      expect(res.body.data.bug.userId).toBe(userAId);
      expect(res.body.data.bug.severity).toBe('high');
      expect(res.body.data.bug.status).toBe('open');
      expect(res.body.data.bug.imageUrl).toContain('screenshot.png');
    });

    it('should reject bug creation with invalid severity', async () => {
      const res = await request(app)
        .post('/api/bugs')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'Some bug',
          description: 'Description here',
          severity: 'critical',
        });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/bugs (Listing & Filtering)', () => {
    beforeEach(async () => {
      await request(app)
        .post('/api/bugs')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'User A Bug 1 (Open)',
          description: 'Detailed description 1',
          severity: 'low',
          status: 'open',
        });

      await request(app)
        .post('/api/bugs')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'User A Bug 2 (Closed)',
          description: 'Detailed description 2',
          severity: 'med',
          status: 'closed',
        });

      await request(app)
        .post('/api/bugs')
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({
          title: 'User B Bug (Open)',
          description: 'Bug owned by User B',
          severity: 'high',
          status: 'open',
        });
    });

    it('should return only bugs belonging to the authenticated user', async () => {
      const resA = await request(app)
        .get('/api/bugs')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(resA.status).toBe(200);
      expect(resA.body.data.bugs.length).toBe(2);
      expect(resA.body.data.bugs.every((b: any) => b.userId === userAId)).toBe(true);

      const resB = await request(app)
        .get('/api/bugs')
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(resB.status).toBe(200);
      expect(resB.body.data.bugs.length).toBe(1);
      expect(resB.body.data.bugs[0].userId).toBe(userBId);
    });

    it('should filter bugs by status', async () => {
      const resOpen = await request(app)
        .get('/api/bugs?status=open')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(resOpen.status).toBe(200);
      expect(resOpen.body.data.bugs.length).toBe(1);
      expect(resOpen.body.data.bugs[0].title).toBe('User A Bug 1 (Open)');

      const resClosed = await request(app)
        .get('/api/bugs?status=closed')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(resClosed.status).toBe(200);
      expect(resClosed.body.data.bugs.length).toBe(1);
      expect(resClosed.body.data.bugs[0].title).toBe('User A Bug 2 (Closed)');
    });
  });

  describe('Bug Details, Ownership & Unauthorized Access', () => {
    let bugAId: string;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/bugs')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'Target Bug for ownership testing',
          description: 'Ownership verification test description',
          severity: 'med',
          imageKey: 'bugs/test/test-image.jpg',
        });
      bugAId = res.body.data.bug.id;
    });

    it('should allow the owner to view the bug details', async () => {
      const res = await request(app)
        .get(`/api/bugs/${bugAId}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(200);
      expect(res.body.data.bug.id).toBe(bugAId);
      expect(res.body.data.bug.imageUrl).toBeDefined();
    });

    it('SECURITY CRITICAL: should prevent User B from viewing User A bug (403 Forbidden)', async () => {
      const res = await request(app)
        .get(`/api/bugs/${bugAId}`)
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('SECURITY CRITICAL: should prevent User B from editing User A bug (403 Forbidden)', async () => {
      const res = await request(app)
        .put(`/api/bugs/${bugAId}`)
        .set('Authorization', `Bearer ${tokenUserB}`)
        .send({
          title: 'Malicious title modification',
        });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('SECURITY CRITICAL: should prevent User B from deleting User A bug (403 Forbidden)', async () => {
      const res = await request(app)
        .delete(`/api/bugs/${bugAId}`)
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(res.status).toBe(403);
      expect(res.body.code).toBe('FORBIDDEN');
    });

    it('should return 400 for invalid MongoDB ObjectId', async () => {
      const res = await request(app)
        .get('/api/bugs/invalid-id-format-123')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(400);
      expect(res.body.code).toBe('VALIDATION_ERROR');
    });

    it('should return 404 for non-existent ObjectId', async () => {
      const nonExistentId = '507f1f77bcf86cd799439011';
      const res = await request(app)
        .get(`/api/bugs/${nonExistentId}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe('NOT_FOUND');
    });
  });

  describe('Bug Update & Image Replacement Cleanup', () => {
    it('should update bug fields and trigger S3 deletion of replaced image', async () => {
      const createRes = await request(app)
        .post('/api/bugs')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'Initial Title',
          description: 'Initial Description',
          severity: 'low',
          imageKey: 'bugs/old-image.png',
        });
      const bugId = createRes.body.data.bug.id;

      const updateRes = await request(app)
        .put(`/api/bugs/${bugId}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'Updated Title',
          status: 'in-progress',
          imageKey: 'bugs/new-image.png',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.bug.title).toBe('Updated Title');
      expect(updateRes.body.data.bug.status).toBe('in-progress');
      expect(updateRes.body.data.bug.imageKey).toBe('bugs/new-image.png');

      expect(deleteS3Spy).toHaveBeenCalledWith('bugs/old-image.png');
    });
  });

  describe('Bug Deletion & S3 Cleanup', () => {
    it('should delete bug from database and clean up image from S3', async () => {
      const createRes = await request(app)
        .post('/api/bugs')
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          title: 'Bug to be deleted',
          description: 'Will be deleted completely',
          severity: 'high',
          imageKey: 'bugs/userA/delete-me.png',
        });
      const bugId = createRes.body.data.bug.id;

      const deleteRes = await request(app)
        .delete(`/api/bugs/${bugId}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.message).toContain('deleted successfully');

      const checkBug = await Bug.findById(bugId);
      expect(checkBug).toBeNull();

      expect(deleteS3Spy).toHaveBeenCalledWith('bugs/userA/delete-me.png');
    });
  });
});
