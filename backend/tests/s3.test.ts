import request from 'supertest';
import app from '../src/app';
import { setupTestDB, clearTestDB, teardownTestDB } from './setup';
import { s3Service } from '../src/services/s3Service';

let authToken: string;
let userId: string;

beforeAll(async () => {
  await setupTestDB();
});

beforeEach(async () => {
  await clearTestDB();
  const res = await request(app).post('/api/auth/signup').send({
    name: 'S3 Tester',
    email: 's3test@example.com',
    password: 'Password123!',
  });
  authToken = res.body.data.token;
  userId = res.body.data.user.id;
});

afterAll(async () => {
  await teardownTestDB();
});

describe('S3 Pre-signed URL & Validation Tests', () => {
  it('should generate pre-signed upload URL for valid image file and type', async () => {
    const res = await request(app)
      .post('/api/bugs/upload-url')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fileName: 'screenshot.png',
        fileType: 'image/png',
        fileSize: 1024 * 500,
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('success');
    expect(res.body.data.uploadUrl).toBeDefined();
    expect(res.body.data.imageKey).toBeDefined();
    expect(res.body.data.imageKey).toContain(`bugs/${userId}/`);
    expect(res.body.data.imageKey.endsWith('.png')).toBe(true);
    expect(res.body.data.requiredHeaders['Content-Type']).toBe('image/png');
  });

  it('should reject unsupported file types (e.g. application/pdf, image/gif)', async () => {
    const resPdf = await request(app)
      .post('/api/bugs/upload-url')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fileName: 'document.pdf',
        fileType: 'application/pdf',
      });

    expect(resPdf.status).toBe(400);
    expect(resPdf.body.code).toBe('VALIDATION_ERROR');

    const resGif = await request(app)
      .post('/api/bugs/upload-url')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fileName: 'animation.gif',
        fileType: 'image/gif',
      });

    expect(resGif.status).toBe(400);
    expect(resGif.body.code).toBe('VALIDATION_ERROR');
  });

  it('should reject files exceeding the 5 MB limit', async () => {
    const overLimitBytes = 5 * 1024 * 1024 + 1; 
    const res = await request(app)
      .post('/api/bugs/upload-url')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        fileName: 'huge-image.jpg',
        fileType: 'image/jpeg',
        fileSize: overLimitBytes,
      });

    expect(res.status).toBe(400);
    expect(res.body.code).toBe('VALIDATION_ERROR');
    expect(res.body.errors[0].message).toContain('5 MB');
  });

  it('should reject unauthorized upload URL request without JWT', async () => {
    const res = await request(app)
      .post('/api/bugs/upload-url')
      .send({
        fileName: 'screenshot.webp',
        fileType: 'image/webp',
      });

    expect(res.status).toBe(401);
  });
});
