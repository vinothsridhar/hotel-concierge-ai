import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { chatRouter } from '../../src/api/routes/chat';

describe('Chat API', () => {
  let app: express.Express;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/chat', chatRouter);
  });

  it('returns 400 for empty message', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({ message: '' });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation error');
  });

  it('returns 400 for missing message field', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({});

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation error');
    expect(response.body.details).toContainEqual(
      expect.objectContaining({ field: 'message' })
    );
  });

  it('returns 400 for non-string message', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({ message: 123 });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('Validation error');
  });

  it('accepts valid message with optional sessionId', async () => {
    const response = await request(app)
      .post('/api/chat')
      .send({ message: 'what rooms do you have?', sessionId: 'test-session' });

    expect(response.status).toBeDefined();
    expect(response.body.sessionId).toBe('test-session');
  });

  it('handles invalid JSON gracefully', async () => {
    const response = await request(app)
      .post('/api/chat')
      .set('Content-Type', 'application/json')
      .send('not valid json');

    expect(response.status).toBe(400);
  });

  it('returns health check endpoint', async () => {
    const healthApp = express();
    healthApp.get('/health', (req, res) => {
      res.json({ status: 'ok' });
    });

    const response = await request(healthApp)
      .get('/health');

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});