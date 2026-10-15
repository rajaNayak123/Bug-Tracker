import request from 'supertest';
import app from '../src/app';

describe('Swagger / OpenAPI Documentation Tests', () => {
  it('GET /api/docs/ should serve Swagger UI HTML', async () => {
    const res = await request(app).get('/api/docs/');

    expect([200, 301, 302]).toContain(res.status);
    if (res.status === 200) {
      expect(res.text).toContain('swagger');
    }
  });

  it('GET /api/docs/json should return valid OpenAPI 3.0 specification JSON', async () => {
    const res = await request(app).get('/api/docs/json');

    expect(res.status).toBe(200);
    expect(res.header['content-type']).toMatch(/json/);
    expect(res.body).toHaveProperty('openapi', '3.0.0');
    expect(res.body).toHaveProperty('info');
    expect(res.body.info).toHaveProperty('title', 'Bug Tracker Lite API');
    expect(res.body).toHaveProperty('paths');
    expect(res.body.paths).toHaveProperty('/auth/signup');
    expect(res.body.paths).toHaveProperty('/auth/login');
    expect(res.body.paths).toHaveProperty('/bugs');
    expect(res.body.paths).toHaveProperty('/bugs/upload-url');
  });
});
