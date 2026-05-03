import { SkillContext, SkillResponse } from '../router/types';

export class StaticSkill {
  async execute(context: SkillContext): Promise<SkillResponse> {
    const { skill } = context;
    
    return {
      skill: skill.name,
      response: skill.response || 'No response configured.'
    };
  }
}