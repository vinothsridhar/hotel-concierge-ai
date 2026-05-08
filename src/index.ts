import * as dotenv from 'dotenv';
import { HotelAgentService } from './agents';
import { TUIApp } from './tui/app';

dotenv.config();

function checkApiKey(): void {
  const key = process.env.OPENAI_API_KEY;
  if (!key || key === 'your_openai_api_key_here') {
    console.error('Error: OPENAI_API_KEY not configured');
    console.error('Edit .env and add your OpenAI API key');
    process.exit(1);
  }
}

async function main() {
  checkApiKey();

  const agentService = new HotelAgentService();
  const app = new TUIApp(agentService);
  app.showWelcome();
  app.run();
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});
