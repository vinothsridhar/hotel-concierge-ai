import { describe, it, expect, beforeEach } from 'vitest';
import * as dotenv from 'dotenv';
import { LLMClientFactory } from '../src/services/openai_client';
import { SkillRouter } from '../src/router/skill_router';

dotenv.config();

describe('Reservation Flow', () => {
  let client: any;
  let router: SkillRouter;

  beforeEach(() => {
    client = LLMClientFactory.create();
    router = new SkillRouter('./data/skills.yaml', client);
  });

  it('multi-turn reservation: start → provide name → provide dates → complete', async () => {
    // Turn 1: Start reservation
    const r1 = await router.route('I want to book a room');
    console.log('Turn 1:', r1.response);
    
    // Should ask for context (name, check-in, etc)
    expect(r1.response).toContain('name');
    
    // Turn 2: Provide name
    const r2 = await router.route('My name is John Smith');
    console.log('Turn 2:', r2.response);
    
    // Should ask for dates or room type
    expect(r2.response).toContain('check');
    
    // Turn 3: Provide dates  
    const r3 = await router.route('May 5 to May 10');
    console.log('Turn 3:', r3.response);
    
    // Wait - still needs room_type. Let's provide it.
    if (r3.response.includes('room_type')) {
      const r3b = await router.route('deluxe room');
      console.log('Turn 3b:', r3b.response);
      expect(r3b.response).toContain('confirmed');
      
      // Turn 4: After confirmation - should work normally
      const r4 = await router.route('what rooms do you have?');
      console.log('Turn 4:', r4.response);
      expect(r4.response).toContain('Standard');
    } else {
      // Contains confirmation
      expect(r3.response).toContain('confirmed');
      expect(r3.response).toContain('Booking Reference');
      
      // Turn 4: After confirmation - should work normally
      const r4 = await router.route('what rooms do you have?');
      console.log('Turn 4:', r4.response);
      
      expect(r4.response).toContain('Standard');
    }
  });

  it('reservation clears context after completion', async () => {
    // Complete a reservation
    await router.route('I want to book a room');
    await router.route('My name is Alice');
    await router.route('May 15 to May 18, executive suite for 2 guests');
    
    // Next query should NOT route to make_reservation
    const response = await router.route('what is the wifi password?');
    expect(response.skill).not.toBe('make_reservation');
  });
});