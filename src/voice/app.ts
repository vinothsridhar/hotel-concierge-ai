import { execSync } from 'child_process';
import { HotelAgentService } from '../agents';
import { transcribeAudio } from './stt';
import { synthesizeSpeech } from './tts';
import { startRecording, stopRecording } from './recorder';
import { playAudio } from './player';

export class VoiceChatApp {
  private agentService: HotelAgentService;
  private running: boolean = false;
  private isRecording: boolean = false;

  constructor(agentService: HotelAgentService) {
    this.agentService = agentService;
  }

  private checkDependencies(): void {
    try {
      execSync('which rec', { stdio: 'ignore' });
      execSync('which play', { stdio: 'ignore' });
    } catch {
      console.error('Error: sox is not installed. Install it with:');
      console.error('  macOS:  brew install sox');
      console.error('  Linux:  sudo apt-get install sox');
      process.exit(1);
    }
  }

  async run(): Promise<void> {
    this.checkDependencies();
    this.running = true;
    const stdin = process.stdin;

    if (!stdin.isTTY) {
      console.error('Voice chat requires a TTY terminal.');
      process.exit(1);
    }

    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    console.log('Welcome to Hotel Concierge AI - Voice Mode');
    console.log('Press SPACE to start speaking, then SPACE again to stop.');
    console.log('Press Q or Esc to quit.\n');

    stdin.on('data', (key: string) => {
      this.handleKey(stdin, key);
    });
  }

  private async handleKey(stdin: NodeJS.ReadStream, key: string): Promise<void> {
    if (key === 'q' || key === '\x1b') {
      this.running = false;
      stopRecording();
      stdin.setRawMode(false);
      stdin.pause();
      console.log('\nGoodbye!');
      process.exit(0);
      return;
    }

    if (key !== ' ') return;
    if (!this.running) return;

    if (this.isRecording) {
      this.isRecording = false;
      stopRecording();
      return;
    }

    this.isRecording = true;

    try {
      console.log('\nRecording... Speak now. Press SPACE to stop.');

      const timeoutMs = parseInt(process.env.RECORD_TIMEOUT || '10000', 10);
      const audioBuffer = await startRecording(timeoutMs);

      console.log('Transcribing...');
      const transcription = await transcribeAudio(audioBuffer);

      if (!transcription.trim()) {
        console.log('Sorry, I did not catch that. Please try again.');
        this.isRecording = false;
        return;
      }

      console.log(`\nYou said: ${transcription}`);

      const result = await this.agentService.route(transcription);
      console.log(`\nConcierge: ${result.response}`);

      console.log('Synthesizing speech...');
      const speechBuffer = await synthesizeSpeech(result.response);

      console.log('Speaking...');
      await playAudio(speechBuffer);

      console.log('\nPress SPACE to speak again, Q to quit.\n');
    } catch (err) {
      console.error('Voice pipeline error:', err);
      console.log('Press SPACE to speak again, Q to quit.\n');
    }

    this.isRecording = false;
  }
}
