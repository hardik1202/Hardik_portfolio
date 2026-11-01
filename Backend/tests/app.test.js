const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../app');

// ========================================================
// Practical 12 & 13: Automated Tests for CI/CD Pipeline
// These tests run WITHOUT a real MongoDB connection.
// They test endpoints that do NOT require database access.
// ========================================================

const TEST_SECRET = process.env.JWT_SECRET || '3e9c5846b6838b51fb09da6b75bfb03d034112d5ddbf9923c5589b7655647b48';
const testToken = jwt.sign({ id: 'ci-test-user-123' }, TEST_SECRET, { expiresIn: '1h' });

describe('Health Check Endpoint', () => {
  test('GET /health returns 200 and status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
    expect(res.body).toHaveProperty('timestamp');
  });
});

describe('Authentication Validation', () => {
  test('GET /tasks without token returns 401', async () => {
    const res = await request(app).get('/tasks');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error', 'No token provided');
  });

  test('GET /tasks with invalid token returns 401', async () => {
    const res = await request(app)
      .get('/tasks')
      .set('Authorization', 'Bearer invalidtoken123');
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error', 'Invalid or expired token');
  });
});

describe('Input Validation', () => {
  test('POST /register without body returns 400', async () => {
    const res = await request(app)
      .post('/register')
      .set('Content-Type', 'application/json')
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error', 'Email and password are required');
  });
});

describe('404 Handler', () => {
  test('GET /nonexistent returns 404', async () => {
    const res = await request(app).get('/nonexistent-route');
    expect(res.statusCode).toBe(404);
    expect(res.body).toHaveProperty('error', 'Route not found');
  });
});

// ===== PRACTICAL 13: AI ENDPOINT TESTS =====
describe('AI Generation Endpoint (Practical 13)', () => {
  test('POST /api/ai/generate-description without token returns 401', async () => {
    const res = await request(app)
      .post('/api/ai/generate-description')
      .set('Content-Type', 'application/json')
      .send({ title: 'Deploy to Kubernetes' });
    expect(res.statusCode).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/ai/generate-description without title returns 400', async () => {
    const res = await request(app)
      .post('/api/ai/generate-description')
      .set('Authorization', `Bearer ${testToken}`)
      .set('Content-Type', 'application/json')
      .send({});
    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /api/ai/generate-description returns 200 with description and priority (graceful fallback)', async () => {
    const res = await request(app)
      .post('/api/ai/generate-description')
      .set('Authorization', `Bearer ${testToken}`)
      .set('Content-Type', 'application/json')
      .send({ title: 'Fix critical database query latency bug' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('description');
    expect(typeof res.body.description).toBe('string');
    expect(res.body.description.length).toBeGreaterThan(0);
    expect(res.body).toHaveProperty('priority');
    expect(['low', 'medium', 'high']).toContain(res.body.priority);
  });
});
