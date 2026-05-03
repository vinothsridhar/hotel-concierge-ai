import { describe, it, expect } from 'vitest';
import { StaticSkill } from '../src/skills/static_skill';
import { SkillContext } from '../src/router/types';

describe('StaticSkill', () => {
  it('should return wifi info', async () => {
    const context: SkillContext = {
      query: 'wifi password',
      skill: {
        name: 'wifi',
        type: 'static',
        description: 'WiFi info',
        response: 'Network: GuestWiFi\nPassword: 12345678'
      }
    };

    const response = await new StaticSkill().execute(context);
    expect(response.response).toContain('GuestWiFi');
  });

  it('should return emergency info', async () => {
    const context: SkillContext = {
      query: 'emergency',
      skill: {
        name: 'emergency',
        type: 'static',
        description: 'Emergency contacts',
        response: 'Emergency: 911\nFront Desk: Ext 100'
      }
    };

    const response = await new StaticSkill().execute(context);
    expect(response.response).toContain('911');
  });

  it('should return checkout info', async () => {
    const context: SkillContext = {
      query: 'checkout time',
      skill: {
        name: 'checkout',
        type: 'static',
        description: 'Checkout time',
        response: 'Standard checkout: 11:00 AM'
      }
    };

    const response = await new StaticSkill().execute(context);
    expect(response.response).toContain('11:00');
  });

  it('should handle missing response', async () => {
    const context: SkillContext = {
      query: 'test',
      skill: {
        name: 'test',
        type: 'static',
        description: 'Test'
      }
    };

    const response = await new StaticSkill().execute(context);
    expect(response.response).toContain('No response');
  });
});