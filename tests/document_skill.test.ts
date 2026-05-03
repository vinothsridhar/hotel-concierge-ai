import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentSkill } from '../src/skills/document_skill';
import { SkillContext } from '../src/router/types';

describe('DocumentSkill', () => {
  let skill: DocumentSkill;

  beforeEach(() => {
    skill = new DocumentSkill();
  });

  it('should read rooms data', async () => {
    const context: SkillContext = {
      query: 'what rooms do you have?',
      skill: {
        name: 'rooms',
        type: 'document',
        description: 'Room information',
        data_source: 'data/rooms.md'
      }
    };

    const response = await skill.execute(context);
    expect(response.response).toContain('Standard Room');
    expect(response.response).toContain('$150');
  });

  it('should read dining data', async () => {
    const context: SkillContext = {
      query: 'dining options',
      skill: {
        name: 'dining',
        type: 'document',
        description: 'Dining info',
        data_source: 'data/menus.md'
      }
    };

    const response = await skill.execute(context);
    expect(response.response).toContain('Restaurant');
  });

  it('should return formatted output with source', async () => {
    const context: SkillContext = {
      query: 'standard room',
      skill: {
        name: 'rooms',
        type: 'document',
        description: 'Room info',
        data_source: 'data/rooms.md'
      }
    };

    const response = await skill.execute(context);
    expect(response.source).toBe('data/rooms.md');
  });

  it('should handle missing data_source', async () => {
    const context: SkillContext = {
      query: 'test',
      skill: {
        name: 'test',
        type: 'document',
        description: 'Test'
      }
    };

    const response = await skill.execute(context);
    expect(response.response).toContain('No data source');
  });
});