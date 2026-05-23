import { spawn } from 'child_process';

export async function playAudio(audioBuffer: Buffer): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const proc = spawn('play', ['-t', 'mp3', '-q', '-'], {
      stdio: ['pipe', 'ignore', 'ignore']
    });

    proc.on('error', (err) => {
      reject(err);
    });

    proc.on('close', (code) => {
      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(new Error(`play exited with code ${code}`));
      }
    });

    proc.stdin.write(audioBuffer);
    proc.stdin.end();
  });
}
