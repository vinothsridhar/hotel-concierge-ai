import * as fs from 'fs';
import mic from 'mic';

let activeMic: any = null;

export async function startRecording(timeoutMs: number = 10000): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    try {
      const micInstance = mic({
        rate: '16000',
        channels: '1',
        debug: false,
        fileType: 'wav'
      });

      activeMic = micInstance;

      const micStream = micInstance.getAudioStream();
      const chunks: Buffer[] = [];

      micStream.on('data', (data: Buffer) => {
        chunks.push(data);
      });

      micStream.on('error', (err: Error) => {
        reject(err);
      });

      micStream.on('startComplete', () => {
        process.stdout.write('\nListening... (recording) \n');
      });

      const timeout = setTimeout(() => {
        process.stdout.write('\nRecording timeout reached.\n');
        stopRecording();
      }, timeoutMs);

      micStream.on('stopComplete', () => {
        clearTimeout(timeout);
        process.stdout.write('\nRecording complete.\n');

        if (chunks.length === 0) {
          reject(new Error('No audio captured'));
          return;
        }

        resolve(Buffer.concat(chunks));
      });

      micInstance.start();
    } catch (err) {
      reject(err);
    }
  });
}

export function stopRecording(): void {
  if (activeMic) {
    try {
      activeMic.stop();
    } catch {
      // ignore stop errors
    }
    activeMic = null;
  }
}
