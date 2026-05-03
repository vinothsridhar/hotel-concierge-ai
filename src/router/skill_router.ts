import * as YAML from 'yaml';
import * as fs from 'fs';
import { Skill, RouterConfig, IntentResult, SkillContext, SkillResponse, ConversationContext, PendingAction } from './types';
import { DocumentSkill } from '../skills/document_skill';
import { DatabaseSkill } from '../skills/database_skill';
import { StaticSkill } from '../skills/static_skill';
import { LLMSkill } from '../skills/llm_skill';
import { LLMClient } from '../services/openai_client';

export class SkillRouter {
  private skills: Skill[] = [];
  private config!: RouterConfig;
  private openai: LLMClient;
  private documentSkill: DocumentSkill;
  private databaseSkill: DatabaseSkill;
  private staticSkill: StaticSkill;
  private llmSkill: LLMSkill;
  private conversationHistory: string[] = [];
  private pendingActions: PendingAction[] = [];
  private lastSkillNeedingContext: string | null = null;

  constructor(skillsPath: string, openai: LLMClient) {
    this.openai = openai;
    this.documentSkill = new DocumentSkill();
    this.databaseSkill = new DatabaseSkill();
    this.staticSkill = new StaticSkill();
    this.llmSkill = new LLMSkill(openai);

    this.loadSkills(skillsPath);
  }

  private loadSkills(skillsPath: string): void {
    const content = fs.readFileSync(skillsPath, 'utf-8');
    const config = YAML.parse(content);
    
    this.skills = config.skills as Skill[];
    this.config = config.router as RouterConfig;
  }

  private getSystemPrompt(): string {
    const skillList = this.skills.map(s => 
      `- ${s.name}: ${s.description}`
    ).join('\n');

    return `You are a hotel concierge assistant. Classify the user query into an appropriate skill.

Available skills:
${skillList}

IMPORTANT - Context Handling:
- If the user refers to something from a previous conversation (e.g., "my booking", "it", "that room"), 
  the query may implicitly reference earlier provided information.
- Extract any identifying information (name, booking_id, email, phone) from BOTH the current query AND previous conversation.
- If user provides new ID in current query, use that. Otherwise look back at conversation history.

Return JSON with: { "skill_name": "...", "confidence": 0.0-1.0, "extracted_data": {...}, "needs_context": true/false, "pending_actions": [{"action": "upgrade|downgrade|date_change|guest_count_change|extend_stay|etc", "needs": "what info is needed", "prompt": "question to ask user"}] }

IMPORTANT - Multiple Actions:
- A single query may contain multiple actions (e.g., "upgrade room and add guest" = upgrade + guest_count_change)
- If an action needs additional info (e.g., guest count number, new date), include it in pending_actions list
- If no additional info needed, don't include in pending_actions`;
  }

  async detectIntent(query: string): Promise<IntentResult & { extracted_data?: Record<string, string>; needs_context?: boolean }> {
    const systemPrompt = this.getSystemPrompt();
    
    const historyContext = this.conversationHistory.length > 0 
      ? "Previous conversation:\n" + this.conversationHistory.map((h, i) => (i + 1) + ". " + h).join("\n") + "\n\n"
      : '';

    const messages: { role: 'system' | 'user'; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: historyContext + "Current query: \"" + query + "\"" }
    ];

    try {
      const response = await this.openai.chat({
        model: '',
        messages: messages
      });
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return { skill_name: 'general', confidence: 0.5, reasoning: 'No parse' };
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      return {
        skill_name: parsed.skill_name || parsed.skill || 'general',
        confidence: parsed.confidence ?? 0.5,
        reasoning: parsed.reasoning || '',
        extracted_data: parsed.extracted_data || {},
        needs_context: parsed.needs_context ?? false,
        pending_actions: parsed.pending_actions || []
      };
    } catch (e: any) {
      return { skill_name: 'general', confidence: 0.5, reasoning: 'Error' };
    }
  }

  async route(query: string): Promise<SkillResponse> {
    try {
      this.conversationHistory.push("User: " + query);

      if (this.pendingActions.length > 0) {
        const numberMatch = query.match(/^\d+$/);
        if (numberMatch) {
          const skill = this.skills.find(s => s.name === 'resolution');
          if (skill) {
            const results: string[] = [];
            for (const pendingAction of this.pendingActions) {
              if (pendingAction.context_data?.['booking_id']) {
                const contextData = { ...pendingAction.context_data, new_guest_count: String(parseInt(query)) };
                const result = await this.executeSkill(query, skill, contextData);
                results.push(result.response);
              }
            }
            this.pendingActions = [];
            if (results.length > 0) {
              const combinedResponse = results.join("\n\n");
              this.conversationHistory.push("Assistant: " + combinedResponse.split("\n")[0] + "...");
              return { skill: skill.name, response: combinedResponse };
            }
          }
        }
      }

      if (this.lastSkillNeedingContext) {
        const skill = this.skills.find(s => s.name === this.lastSkillNeedingContext);
        if (skill && skill.requires_context && skill.context_fields) {
          const extracted = await this.extractFromHistory(query);
          const contextData: Record<string, string> = {};
          
          for (const field of skill.context_fields) {
            if (extracted[field]) {
              contextData[field] = extracted[field];
            }
          }

          const stillNeedsInfo = skill.context_fields.some(field => contextData[field]);

          if (!stillNeedsInfo) {
            const prompt = this.askForContext(skill.name, skill.context_fields);
            return {
              skill: skill.name,
              response: prompt,
              needs_context: true,
              context_prompt: prompt
            };
          }

          const result = await this.executeSkill(query, skill, contextData);
          this.conversationHistory.push("Assistant: " + result.response.split("\n")[0] + "...");
          this.lastSkillNeedingContext = null;
          return result;
        }
      }

      const intent = await this.detectIntent(query);
    
    if (intent.confidence >= this.config.confidence_threshold) {
      const skill = this.skills.find(s => s.name === intent.skill_name);
      
      if (skill) {
        if (skill.requires_context && skill.context_fields) {
          const contextData: Record<string, string> = {};
          const extractedData = intent.extracted_data || {};
          
          for (const field of skill.context_fields) {
            if (extractedData[field]) {
              contextData[field] = extractedData[field];
            }
          }

          const hasInfo = skill.context_fields.some(field => contextData[field]);
          
          if (!hasInfo) {
            const extracted = await this.extractFromHistory(query);
            Object.assign(contextData, extracted);
          }

          const stillNeedsInfo = skill.context_fields.some(field => contextData[field]);

          if (!stillNeedsInfo) {
            const prompt = this.askForContext(skill.name, skill.context_fields);
            this.lastSkillNeedingContext = skill.name;
            return {
              skill: skill.name,
              response: prompt,
              needs_context: true,
              context_prompt: prompt
            };
          }

          const result = await this.executeSkill(query, skill, contextData);
          this.conversationHistory.push("Assistant: " + result.response.split("\n")[0] + "...");
          
          if (intent.pending_actions && intent.pending_actions.length > 0 && contextData['booking_id']) {
            for (const pa of intent.pending_actions) {
              this.pendingActions.push({ action: pa.action, skill: skill.name, context_data: contextData });
            }
          }
          return result;
        }
        
        const result = await this.executeSkill(query, skill);
        this.conversationHistory.push("Assistant: " + result.response.split("\n")[0] + "...");
        return result;
      }
    }

    if (this.config.use_llm_fallback) {
      const fallback = this.skills.find(s => s.fallback);
      if (fallback) {
        const result = await this.executeSkill(query, fallback);
        this.conversationHistory.push("Assistant: " + result.response.split("\n")[0] + "...");
        return result;
      }
    }

    return {
      skill: 'general',
      response: "I'm here to help with any questions about your stay. Please ask me about rooms, dining, amenities, or your booking."
    };
  } catch (e: any) {
    console.error('Route error:', e);
    return {
      skill: 'general',
      response: "Sorry, something went wrong. Please try again."
    };
  }
}

  private async extractFromHistory(query: string): Promise<Record<string, string>> {
    const prompt = `Extract guest identification from this query or conversation history.
    
Query: "${query}"

Conversation history:
${this.conversationHistory.join('\n')}

Return JSON with any of: { "name": "...", "booking_id": "...", "email": "...", "phone": "..." }
If nothing found, return empty JSON {}`;

    try {
      const response = await this.openai.chat({
        model: '',
        messages: [{ role: 'system', content: prompt }, { role: 'user', content: query }]
      });
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {}
    
    return {};
  }

  private askForContext(skillName: string, fields: string[]): string {
    const prompts: Record<string, string> = {
      bookings: "Could you please provide your booking reference number or your name?",
      discrepancy: "Could you provide your booking reference to look into this?",
      resolution: "I need your booking reference to process this request.",
      billing: "Could you provide your booking reference or name?",
      guest_info: "Could you provide your name or booking reference?"
    };
    
    return prompts[skillName] || "I need some information to help you. Could you provide your " + fields.join(' or ') + "?";
  }

  private async executeSkill(query: string, skill: Skill, contextData?: Record<string, string>): Promise<SkillResponse> {
    const skillContext: SkillContext = {
      query,
      skill,
      context_data: contextData
    };

    switch (skill.type) {
      case 'document':
        return this.documentSkill.execute(skillContext);
      case 'database':
        return this.databaseSkill.execute(skillContext);
      case 'static':
        return this.staticSkill.execute(skillContext);
      case 'llm':
        return this.llmSkill.execute(skillContext);
      default:
        return { skill: skill.name, response: "I'm not sure how to handle that request." };
    }
  }

  clearHistory(): void {
    this.conversationHistory = [];
    this.pendingActions = [];
  }

  getHistory(): string[] {
    return [...this.conversationHistory];
  }
}