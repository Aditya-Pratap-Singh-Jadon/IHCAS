require('dotenv').config();
const request = require('supertest');
const app = require('../../src/app');
const pool = require('../../src/config/db');
const validate = require('../../src/middleware/validate');
const { z } = require('zod');
const express = require('express');

describe('App Foundation Integration Tests', () => {
  
  afterAll(async () => {
    // Make sure we end the pool to avoid jest hanging
    await pool.end();
  });

  describe('Health Endpoints', () => {
    it('GET /api/health should return expected success response', async () => {
      const res = await request(app).get('/api/health');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Application is responsive');
    });

    it('GET /api/health/db should succeed when MySQL is reachable', async () => {
      const res = await request(app).get('/api/health/db');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Database is reachable');
    });

    it('GET /api/health/db should fail appropriately when connectivity is unavailable', async () => {
      // Mock the pool.query to simulate a database connection error
      const querySpy = jest.spyOn(pool, 'query').mockRejectedValueOnce(new Error('Connection lost'));
      
      const res = await request(app).get('/api/health/db');
      expect(res.statusCode).toBe(503);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Database connection failed');
      
      querySpy.mockRestore();
    });
  });

  describe('Routing and Error Handling', () => {
    it('Unknown API routes should return a consistent 404 response', async () => {
      const res = await request(app).get('/api/unknown/path');
      expect(res.statusCode).toBe(404);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Resource not found');
    });

    it('Unexpected errors are handled by centralized middleware', async () => {
      const testApp = express();
      testApp.get('/test-error', (req, res, next) => {
        next(new Error('Something blew up!'));
      });
      testApp.use(require('../../src/middleware/errorHandler'));

      const res = await request(testApp).get('/test-error');
      expect(res.statusCode).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Internal Server Error');
    });
  });

  describe('Validation Infrastructure', () => {
    it('Validation failures return a controlled client error', async () => {
      const schema = {
        body: z.object({
          email: z.string().email(),
          age: z.number().min(18)
        })
      };

      const testApp = express();
      testApp.use(express.json());
      testApp.post('/test-validate', validate(schema), (req, res) => {
        res.status(200).json({ success: true, data: req.body });
      });
      testApp.use(require('../../src/middleware/errorHandler'));

      const res = await request(testApp)
        .post('/test-validate')
        .send({ email: 'not-an-email', age: 10 });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.message).toBe('Validation failed');
      expect(res.body.error.details).toBeDefined();
    });
  });
});
