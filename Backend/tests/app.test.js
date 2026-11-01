const request = require('supertest');
const app = require('../app');

// ========================================================
// Practical 12: Automated Tests for CI/CD Pipeline
// These tests run WITHOUT a real MongoDB connection.
// They test endpoints that do NOT require database access.
// ========================================================

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
