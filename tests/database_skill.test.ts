import { describe, it, expect, beforeEach } from 'vitest';
import { DatabaseSkill } from '../src/skills/database_skill';
import { SkillContext } from '../src/router/types';

describe('DatabaseSkill', () => {
  let skill: DatabaseSkill;

  beforeEach(() => {
    skill = new DatabaseSkill();
  });

  describe('bookings', () => {
    it('should return all bookings for general query', async () => {
      const context: SkillContext = {
        query: 'show all my bookings',
        skill: {
          name: 'bookings',
          type: 'database',
          description: 'Booking info',
          data_source: 'data/bookings.json'
        }
      };

      const response = await skill.execute(context);
      expect(response.response).toContain('B1001');
      expect(response.response).toContain('B1002');
    });

    it('should filter by booking_id', async () => {
      const context: SkillContext = {
        query: 'check B1001',
        skill: {
          name: 'bookings',
          type: 'database',
          description: 'Booking info',
          data_source: 'data/bookings.json'
        },
        context_data: { booking_id: 'B1001' }
      };

      const response = await skill.execute(context);
      expect(response.response).toContain('B1001');
      expect(response.response).not.toContain('B1002');
    });

    it('should filter by guest name', async () => {
      const context: SkillContext = {
        query: 'John booking',
        skill: {
          name: 'bookings',
          type: 'database',
          description: 'Booking info',
          data_source: 'data/bookings.json'
        },
        context_data: { name: 'John Smith' }
      };

      const response = await skill.execute(context);
      expect(response.response).toContain('B1001');
    });
  });

  describe('guests', () => {
    it('should return guest info', async () => {
      const context: SkillContext = {
        query: 'find John Smith',
        skill: {
          name: 'guest_info',
          type: 'database',
          description: 'Guest info',
          data_source: 'data/bookings.json'
        },
        context_data: { name: 'John' }
      };

      const response = await skill.execute(context);
      expect(response.response).toContain('John Smith');
      expect(response.response).toContain('Gold');
    });
  });

  describe('invoices', () => {
    it('should return billing info', async () => {
      const context: SkillContext = {
        query: 'billing for B1001',
        skill: {
          name: 'billing',
          type: 'database',
          description: 'Billing info',
          data_source: 'data/bookings.json'
        },
        context_data: { booking_id: 'B1001' }
      };

      const response = await skill.execute(context);
      expect(response.response).toContain('800');
    });
  });
});