import { describe, it, expect, beforeEach } from 'vitest';
import * as dotenv from 'dotenv';
import { LLMClientFactory } from '../src/services/openai_client';
import { SkillRouter } from '../src/router/skill_router';

dotenv.config();

describe('Conversation Flows', () => {
  let client: any;
  let router: SkillRouter;

  beforeEach(() => {
    client = LLMClientFactory.create();
  });

  describe('Single-turn queries (no context needed)', () => {
    it('rooms query returns room list', async () => {
      router = new SkillRouter('./data/skills.yaml', client);
      const response = await router.route('what rooms do you have?');
      
      expect(response.response).toContain('Standard Room');
      expect(response.response).toContain('$150');
    });

    it('dining query returns restaurant info', async () => {
      router = new SkillRouter('./data/skills.yaml', client);
      const response = await router.route('show dining options');
      
      expect(response.response).toContain('Restaurant');
    });

    it('wifi query returns wifi info', async () => {
      router = new SkillRouter('./data/skills.yaml', client);
      const response = await router.route('what is the wifi password?');
      
      expect(response.response).toContain('GrandHorizon_Guest');
    });

    it('checkout query returns checkout time', async () => {
      router = new SkillRouter('./data/skills.yaml', client);
      const response = await router.route('when is checkout?');
      
      expect(response.response).toContain('11:00');
    });

    it('emergency query returns contacts', async () => {
      router = new SkillRouter('./data/skills.yaml', client);
      const response = await router.route('emergency contact');
      
      expect(response.response).toContain('911');
    });
  });

  describe('Two-turn conversation flow', () => {
    it('bookings: ask → provide booking ID → get booking', async () => {
      router = new SkillRouter('./data/skills.yaml', client);
      
      // First turn - ask about booking
      const response1 = await router.route('I need to know about my bookings');
      expect(response1.needs_context).toBe(true);
      expect(response1.response).toContain('booking reference');
      
      // Second turn - provide ID
      const response2 = await router.route('B1001');
      expect(response2.response).toContain('B1001');
    });

    it('change_booking: handles discrepancy query', async () => {
      router = new SkillRouter('./data/skills.yaml', client);
      
      // First - get booking info to establish context
      await router.route('show my booking');
      await router.route('B1001');
      
      // Second - mention discrepancy
      const response = await router.route('I booked standard but showing deluxe room');
      expect(response.response).toContain('Deluxe');
    });

    it('billing: ask → provide name → get invoices', async () => {
      router = new SkillRouter('./data/skills.yaml', client);
      
      const response1 = await router.route('show my bill');
      expect(response1.needs_context).toBe(true);
      
      const response2 = await router.route('John Smith');
      expect(response2.response.length).toBeGreaterThan(10);
    });

    it('bookings: ask → provide name → get booking', async () => {
      router = new SkillRouter('./data/skills.yaml', client);
      
      const r1 = await router.route('show my bookings');
      expect(r1.needs_context).toBe(true);
      
      const r2 = await router.route('John Smith');
      expect(r2.response).toContain('B1001');
      expect(r2.response).toContain('G001');
    });

    it('guest_info: ask → provide name → get profile', async () => {
      router = new SkillRouter('./data/skills.yaml', client);
      
      const r1 = await router.route('show my profile');
      expect(r1.needs_context).toBe(true);
      
      const r2 = await router.route('Emily Johnson');
      expect(r2.response).toContain('Platinum');
    });
  });

  describe('Single-turn with context embedded', () => {
    it('booking query with name returns directly', async () => {
      router = new SkillRouter('./data/skills.yaml', client);
      const response = await router.route('check booking for John Smith');
      
      expect(response.response).toContain('B1001');
      expect(response.response).toContain('Deluxe');
    });

    it('booking query with booking ID returns directly', async () => {
      router = new SkillRouter('./data/skills.yaml', client);
      const response = await router.route('show booking B1002');
      
      expect(response.response).toContain('B1002');
      expect(response.response).toContain('Executive Suite');
      expect(response.response).toContain('anything else');
    });
  });

  describe('Skill routing accuracy', () => {
    it('routes rooms query correctly', async () => {
      router = new SkillRouter('./data/skills.yaml', client);
      const response = await router.route('what rooms are available?');
      
      expect(response.skill).toBe('rooms');
      expect(response.response).toContain('Standard');
    });

    it('routes wifi query to static skill', async () => {
      router = new SkillRouter('./data/skills.yaml', client);
      const response = await router.route('wifi network');
      
      expect(response.skill).toBe('wifi');
      expect(response.response).toContain('WiFi');
    });

    it('routes bookings query to database skill', async () => {
      router = new SkillRouter('./data/skills.yaml', client);
      const response = await router.route('my reservation');
      
      // Should either route to bookings or ask for context
      expect(['bookings', 'general']).toContain(response.skill);
    });
  });

  describe('Error handling', () => {
    it('handles invalid booking ID gracefully', async () => {
      router = new SkillRouter('./data/skills.yaml', client);
      
      const r1 = await router.route('check my booking');
      await router.route('XXXX');
      const r2 = await router.route('this is not a real booking');
      
      // Should handle gracefully
      expect(r2.response).toBeTruthy();
    });

    it('handles empty query', async () => {
      router = new SkillRouter('./data/skills.yaml', client);
      const response = await router.route('');
      
      expect(response.response).toBeTruthy();
    });
  });
});