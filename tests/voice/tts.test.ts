import { describe, expect, it, vi } from 'vitest';

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      audio: {
        speech: {
          create: vi.fn().mockResolvedValue({
            arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8))
          })
        }
      }
    }))
  };
});

describe('tts', () => {
  it('synthesizes speech and returns buffer', async () => {
    const { synthesizeSpeech } = await import('../../src/voice/tts');

    const result = await synthesizeSpeech('Hello, this is a test.');

    expect(result).toBeInstanceOf(Buffer);
    expect(result.length).toBeGreaterThan(0);
  });
});
