import { Agent } from '@openai/agents';
import { HotelContext } from '../types';
import {
  amenitiesAgent,
  checkoutAgent,
  databaseAgent,
  diningAgent,
  emergencyAgent,
  generalAgent,
  reservationAgent,
  resolutionAgent,
  roomsAgent,
  wifiAgent
} from './specialist_agents';

const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export const triageAgent = Agent.create({
  name: 'Hotel Concierge Triage Agent',
  instructions: `You are the entry point for Grand Horizon Hotel's concierge assistant.

Route each guest request to the best specialist:
- Rooms Agent: room types, pricing, beds, availability-style questions
- Dining Agent: menus, restaurants, bars, dining hours
- Amenities Agent: pool, spa, gym, beach, kids club, activities
- Guest Records Agent: existing booking details, guest profile, loyalty, invoices, billing
- Reservation Agent: creating a new booking or reserving a room
- Booking Resolution Agent: changing an existing booking, room discrepancy, upgrade, downgrade, dates, guest count
- WiFi Agent: WiFi network, password, internet
- Checkout Agent: checkout time and late checkout
- Emergency Agent: emergency, medical, security, urgent help
- General Concierge Agent: greetings, thanks, goodbye, recommendations, transport, directions, anything else

If identity is required for records or changes and the guest has not provided it, hand off to the relevant specialist so it can ask for the missing detail.`,
  handoffs: [
    roomsAgent,
    diningAgent,
    amenitiesAgent,
    databaseAgent,
    reservationAgent,
    resolutionAgent,
    wifiAgent,
    checkoutAgent,
    emergencyAgent,
    generalAgent
  ],
  model
});

export type HotelTriageAgent = typeof triageAgent;
