import * as dotenv from 'dotenv';
import * as path from 'path';
import { LLMClientFactory } from './services/openai_client';
import { SkillRouter } from './router/skill_router';
import { TUIApp } from './tui/app';

dotenv.config();

function checkApiKey(): void {
  const provider = (process.env.LLM_PROVIDER || 'openai').toLowerCase();
  
  if (provider === 'grok') {
    const key = process.env.GROK_API_KEY;
    if (!key || key === 'your_grok_api_key_here') {
      console.error('Error: GROK_API_KEY not configured');
      console.error('Edit .env and add your Grok API key');
      process.exit(1);
    }
  } else {
    const key = process.env.OPENAI_API_KEY;
    if (!key || key === 'your_openai_api_key_here') {
      console.error('Error: OPENAI_API_KEY not configured');
      console.error('Edit .env and add your OpenAI API key');
      process.exit(1);
    }
  }
}

async function main() {
  checkApiKey();
  
  const openai = LLMClientFactory.create();
  const skillsPath = path.resolve(process.cwd(), 'data/skills.yaml');
  const router = new SkillRouter(skillsPath, openai);
  
  const app = new TUIApp(router);
  app.showWelcome();
  app.run();
}

main().catch(e => {
  console.error('Fatal error:', e);
  process.exit(1);
});