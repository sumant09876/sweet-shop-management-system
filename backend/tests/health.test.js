const request = require('supertest');
const app = require('../server');

test('GET /api/health should return OK status', async () => {
  const response = await request(app).get('/api/health');
  
  expect(response.status).toBe(200);
  expect(response.body.status).toBe('OK');
  expect(response.body.message).toBe('Sweet Shop API is running');
});


