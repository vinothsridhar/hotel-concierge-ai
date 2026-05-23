import { describe, expect, it, vi } from 'vitest';

vi.mock('openai', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      audio: {
        transcriptions: {
          create: vi.fn().mockResolvedValue('What rooms do you have available?')
        }
      }
    }))
  };
});

describe('stt', () => {
  it('transcribes audio buffer via Whisper', async () => {
    const { transcribeAudio } = await import('../../src/voice/stt');

    const wavBuffer = Buffer.alloc(44);
    wavBuffer.write('RIFF', 0, 'ascii');

    const result = await transcribeAudio(wavBuffer);
    expect(result).toBe('What rooms do you have available?');
  });
});
