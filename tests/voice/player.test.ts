import { describe, expect, it, vi } from 'vitest';

vi.mock('child_process', () => ({
  spawn: vi.fn().mockImplementation(() => ({
    stdin: {
      write: vi.fn(),
      end: vi.fn()
    },
    on: vi.fn((event: string, cb: Function) => {
      if (event === 'close') cb(0);
    })
  }))
}));

describe('player', () => {
  it('plays audio buffer via sox play', async () => {
    const { playAudio } = await import('../../src/voice/player');
    const { spawn } = await import('child_process');

    const buffer = Buffer.from('fake mp3 data');
    await playAudio(buffer);

    expect(spawn).toHaveBeenCalledWith('play', ['-t', 'mp3', '-q', '-'], expect.any(Object));
  });
});
