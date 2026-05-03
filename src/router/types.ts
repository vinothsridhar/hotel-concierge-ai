export type SkillType = 'document' | 'database' | 'static' | 'llm';

export interface Skill {
  name: string;
  type: SkillType;
  description: string;
  data_source?: string;
  response?: string;
  fallback?: boolean;
  requires_context?: boolean;
  context_fields?: string[];
}

export interface RouterConfig {
  use_llm_fallback: boolean;
  confidence_threshold: number;
  intent_timeout: number;
  response_timeout: number;
}

export interface SkillResponse {
  skill: string;
  response: string;
  source?: string;
  needs_context?: boolean;
  context_prompt?: string;
}

export interface IntentResult {
  skill_name: string;
  confidence: number;
  reasoning: string;
  pending_actions?: { action: string; needs: string; prompt: string }[];
}

export interface IntentRequest {
  query: string;
  skills: Skill[];
}

export interface SkillContext {
  query: string;
  skill: Skill;
  context_data?: Record<string, string>;
}

export interface PendingAction {
  action: string;
  skill: string;
  context_data?: Record<string, string>;
}

export interface ConversationContext {
  pending_actions: PendingAction[];
  pending_fields?: string[];
  extracted_data: Record<string, string>;
  last_topic?: string;
  last_booking_id?: string;
  last_guest_id?: string;
}