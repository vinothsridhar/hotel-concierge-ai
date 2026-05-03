import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as dotenv from 'dotenv';
import { LLMClientFactory } from '../src/services/openai_client';
import { SkillRouter } from '../src/router/skill_router';

dotenv.config();

describe('SkillRouter', () => {
  let router: SkillRouter;
  let client: any;

  beforeEach(async () => {
    client = LLMClientFactory.create();
    router = new SkillRouter('./data/skills.yaml', client);
  });

  describe('document skills', () => {
    it('should return room information', async () => {
      const response = await router.route('what rooms do you have?');
      expect(response.response).toContain('Standard Room');
      expect(response.response).toContain('$150');
    });

    it('should return dining options', async () => {
      const response = await router.route('what dining options do you have?');
      expect(response.response).toContain('Restaurant');
    });

    it('should return amenities', async () => {
      const response = await router.route('show hotel amenities');
      expect(response.response).toContain('Pool');
    });
  });

  describe('static skills', () => {
    it('should return wifi info', async () => {
      const response = await router.route('what is the wifi password?');
      expect(response.response).toContain('GrandHorizon_Guest');
    });

    it('should return emergency info', async () => {
      const response = await router.route('emergency contacts');
      expect(response.response).toContain('911');
    });

    it('should return checkout info', async () => {
      const response = await router.route('checkout time');
      expect(response.response).toContain('11:00');
    });
  });

  describe('database skills with context', () => {
    it('should ask for context when no identity provided for bookings', async () => {
      const response = await router.route('I need to know about my bookings');
      expect(response.needs_context).toBe(true);
      expect(response.response).toContain('booking');
    });

    it('should return booking with booking_id', async () => {
      const response = await router.route('My booking ID is B1001');
      expect(response.response).toContain('B1001');
      expect(response.response).toContain('Deluxe');
    });

    it('should return booking with guest name', async () => {
      const response = await router.route('check booking for John Smith');
      expect(response.response).toContain('B1001');
    });

    it('should return guest info with name', async () => {
      const response = await router.route('What is my loyalty status? I am John Smith');
      expect(response.response).toContain('John Smith') || response.response.toContain('Gold');
    });
  });

  describe('llm fallback', () => {
    it('should handle general queries', async () => {
      const response = await router.route('what time is dinner served?');
      expect(response.response.length).toBeGreaterThan(10);
    });
  });

  describe('edge cases', () => {
    it('should handle unknown queries gracefully', async () => {
      const response = await router.route('xyzabc123unknown');
      expect(response.response).toBeTruthy();
    });
  });
});