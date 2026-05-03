import OpenAI from 'openai';
import * as dotenv from 'dotenv';

dotenv.config();

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
}

export interface LLMClient {
  chat(options: ChatOptions): Promise<string>;
}

function getProviderConfig(): { provider: string; apiKey: string; baseURL?: string; model: string } {
  const provider = (process.env.LLM_PROVIDER || 'openai').toLowerCase();
  
  switch (provider) {
    case 'grok':
      return {
        provider: 'grok',
        apiKey: process.env.GROK_API_KEY || '',
        baseURL: process.env.OPENAI_BASE_URL || 'https://api.x.ai/v1',
        model: process.env.GROK_MODEL || 'grok-2'
      };
    case 'openai':
    default:
      return {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY || '',
        model: process.env.OPENAI_MODEL || 'gpt-4o'
      };
  }
}

export class LLMClientFactory {
  static create(): LLMClient {
    const config = getProviderConfig();
    
    if (!config.apiKey) {
      throw new Error(`${config.provider.toUpperCase()}_API_KEY not configured`);
    }

    const client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL
    });

    return new OpenAIBasedClient(client, config.model);
  }
}

class OpenAIBasedClient implements LLMClient {
  private client: OpenAI;
  private defaultModel: string;

  constructor(client: OpenAI, defaultModel: string) {
    this.client = client;
    this.defaultModel = defaultModel;
  }

  async chat(options: ChatOptions): Promise<string> {
    const response = await this.client.chat.completions.create({
      model: options.model || this.defaultModel,
      messages: options.messages as OpenAI.ChatCompletionMessageParam[],
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens ?? 500
    });

    return response.choices[0]?.message?.content || 'No response';
  }
}

export class OpenAIClient {
  private client: LLMClient;
  private model: string;

  constructor(apiKey?: string) {
    this.client = LLMClientFactory.create();
    const config = getProviderConfig();
    this.model = config.model;
  }

  async chat(messages: { role: 'system' | 'user'; content: string }[]): Promise<string> {
    return this.client.chat({
      model: this.model,
      messages: messages
    });
  }
}