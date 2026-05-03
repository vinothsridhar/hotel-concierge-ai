import { describe, it, expect, beforeEach } from 'vitest';
import * as dotenv from 'dotenv';
import { LLMClientFactory } from '../src/services/openai_client';

dotenv.config();

describe('LLMClient', () => {
  let client: any;

  beforeEach(() => {
    client = LLMClientFactory.create();
  });

  it('should chat successfully', async () => {
    const response = await client.chat({
      model: '',
      messages: [{ role: 'user', content: 'Say "hello"' }]
    });
    expect(response).toBeTruthy();
    expect(response.toLowerCase()).toContain('hello');
  });

  it('should handle system prompt', async () => {
    const response = await client.chat({
      model: '',
      messages: [
        { role: 'system', content: 'Respond with exactly: OK' },
        { role: 'user', content: 'Confirm' }
      ]
    });
    expect(response.toLowerCase()).toContain('ok');
  });

  it('should handle JSON extraction', async () => {
    const response = await client.chat({
      model: '',
      messages: [
        { role: 'user', content: 'Return JSON: {"status": "success"}' }
      ]
    });
    expect(response).toContain('status');
  });
});