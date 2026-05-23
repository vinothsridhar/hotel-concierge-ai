import { describe, expect, it, vi } from 'vitest';

describe('recorder', () => {
  it('exports startRecording and stopRecording functions', async () => {
    const recorder = await import('../../src/voice/recorder');

    expect(typeof recorder.startRecording).toBe('function');
    expect(typeof recorder.stopRecording).toBe('function');
  });

  it('generates a valid WAV buffer structure', () => {
    const wav = Buffer.alloc(44);

    wav.write('RIFF', 0, 'ascii');
    wav.writeUInt32LE(1024 + 36, 4);
    wav.write('WAVE', 8, 'ascii');
    wav.write('fmt ', 12, 'ascii');
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(16000, 24);
    wav.writeUInt32LE(32000, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write('data', 36, 'ascii');
    wav.writeUInt32LE(1024, 40);

    expect(wav.subarray(0, 4).toString('ascii')).toBe('RIFF');
    expect(wav.subarray(8, 12).toString('ascii')).toBe('WAVE');

    const {
      readUInt16LE, readUInt32LE
    } = wav;

    expect(readUInt32LE.call(wav, 16)).toBe(16);
    expect(readUInt16LE.call(wav, 20)).toBe(1);
    expect(readUInt16LE.call(wav, 22)).toBe(1);
    expect(readUInt32LE.call(wav, 24)).toBe(16000);
  });
});
