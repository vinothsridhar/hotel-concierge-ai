import { SkillContext, SkillResponse } from '../router/types';
import { DocumentSkill } from './document_skill';
import { DatabaseSkill } from './database_skill';
import { StaticSkill } from './static_skill';
import { LLMSkill } from './llm_skill';
import { LLMClient } from '../services/openai_client';

export interface SkillHandler {
  (context: SkillContext, next: () => Promise<SkillResponse>): Promise<SkillResponse>;
}

export class SkillChain {
  private documentSkill: DocumentSkill;
  private databaseSkill: DatabaseSkill;
  private staticSkill: StaticSkill;
  private llmSkill: LLMSkill;
  private skills: Map<string, SkillHandler> = new Map();
  public reservationContext: { name?: string; check_in?: string; check_out?: string; room_type?: string; guests?: number } = {};

  constructor(openai: LLMClient) {
    this.documentSkill = new DocumentSkill();
    this.databaseSkill = new DatabaseSkill();
    this.staticSkill = new StaticSkill();
    this.llmSkill = new LLMSkill(openai, this);

    this.register('document', this.documentSkill.execute.bind(this.documentSkill));
    this.register('database', this.databaseSkill.execute.bind(this.databaseSkill));
    this.register('static', this.staticSkill.execute.bind(this.staticSkill));
    this.register('llm', this.llmSkill.execute.bind(this.llmSkill));
  }

  private register(type: string, handler: SkillHandler): void {
    this.skills.set(type, handler);
  }

  async execute(context: SkillContext): Promise<SkillResponse> {
    const handler = this.skills.get(context.skill.type);
    
    if (!handler) {
      return { skill: context.skill.name, response: 'No handler for skill type: ' + context.skill.type };
    }

    return handler(context, async () => {
      return { skill: context.skill.name, response: '' };
    });
  }

  async forward(skillName: string, context: SkillContext): Promise<SkillResponse> {
    const skill = { ...context.skill };
    const originalType = skill.type;
    
    context.skill.type = skillName as any;
    const result = await this.execute(context);
    context.skill.type = originalType;
    
    return result;
  }

  getDatabaseSkill(): DatabaseSkill {
    return this.databaseSkill;
  }
}