import { describe, expect, it } from 'vitest';
import { HotelAgentService } from '../../src/agents';

const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'your_openai_api_key_here');

describe('HotelAgentService', () => {
  it('handles empty input without calling the model', async () => {
    const service = new HotelAgentService();
    const result = await service.route('   ');

    expect(result.skill).toBe('general');
    expect(result.response).toContain('Please type a question');
  });

  it.skipIf(!hasOpenAIKey)('routes a room query through the Agents SDK', async () => {
    const service = new HotelAgentService();
    const result = await service.route('what rooms do you have?');

    expect(result.response).toContain('Standard');
  });
});
