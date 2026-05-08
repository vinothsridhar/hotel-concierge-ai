import { MemorySession, Runner } from '@openai/agents';
import { AgentRouteResponse, HotelContext } from '../types';
import { triageAgent } from './triage_agent';

export class HotelAgentService {
  private readonly runner: Runner;
  private session: MemorySession;
  private readonly context: HotelContext = {};

  constructor() {
    this.runner = new Runner({
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      tracingDisabled: true
    });
    this.session = new MemorySession({ sessionId: 'hotel-concierge-tui' });
  }

  async route(query: string): Promise<AgentRouteResponse> {
    if (!query.trim()) {
      return {
        skill: 'general',
        response: 'Please type a question so I can help with your stay.'
      };
    }

    try {
      const result = await this.runner.run(triageAgent, query, {
        context: this.context,
        session: this.session,
        maxTurns: 8
      });

      return {
        skill: result.lastAgent?.name || 'agent',
        response: String(result.finalOutput || 'How can I help with your stay?')
      };
    } catch (error) {
      return {
        skill: 'general',
        response: 'Sorry, I encountered an error while contacting the concierge agent. Please try again.'
      };
    }
  }

  clearHistory(): void {
    this.session = new MemorySession({ sessionId: 'hotel-concierge-tui' });
  }
}
