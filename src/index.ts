import * as dotenv from 'dotenv';
import { HotelAgentService } from './agents';
import { TUIApp } from './tui/app';
import { startApiServer } from './api/server';
import { VoiceChatApp } from './voice/app';

dotenv.config();

function checkApiKey(): void {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key === 'your_openai_api_key_here') {
    console.error('Error: OPENAI_API_KEY not configured');
    console.error('Edit .env and add your OpenAI API key');
    process.exit(1);
  }
}

async function startTUI() {
  checkApiKey();

  const agentService = new HotelAgentService();
  const app = new TUIApp(agentService);
  app.showWelcome();
  app.run();
}

async function startVoice() {
  checkApiKey();

  const agentService = new HotelAgentService();
  const app = new VoiceChatApp(agentService);
  app.run();
}

async function startAPI() {
  checkApiKey();
  startApiServer();
}

const mode = process.argv[2] || 'tui';

if (mode === 'voice') {
  startVoice();
} else if (mode === 'api') {
  startAPI();
} else if (mode === 'tui') {
  startTUI();
} else {
  console.error(`Unknown mode: ${mode}`);
  console.log('Usage: npm start [tui|api|voice]');
  process.exit(1);
}
