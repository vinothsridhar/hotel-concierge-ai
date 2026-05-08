import { Agent } from '@openai/agents';
import { amenitiesTool, diningTool, roomsTool } from '../tools/document_tools';
import { databaseTool, updateBookingTool } from '../tools/database_tool';
import { reservationTool } from '../tools/reservation_tool';
import { HotelContext } from '../types';

const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

export const roomsAgent = new Agent<HotelContext>({
  name: 'Rooms Agent',
  handoffDescription: 'Answers questions about room types, prices, beds, occupancy, and room amenities.',
  instructions: 'Answer guest questions about hotel rooms. Always use get_room_info before answering. Keep responses concise and quote prices exactly as provided.',
  model,
  tools: [roomsTool]
});

export const diningAgent = new Agent<HotelContext>({
  name: 'Dining Agent',
  handoffDescription: 'Answers restaurant, menu, cuisine, hours, and dining price questions.',
  instructions: 'Answer guest questions about restaurants and dining. Always use get_dining_info before answering. Keep responses concise and practical.',
  model,
  tools: [diningTool]
});

export const amenitiesAgent = new Agent<HotelContext>({
  name: 'Amenities Agent',
  handoffDescription: 'Answers questions about hotel facilities, pool, spa, gym, beach, kids club, and activities.',
  instructions: 'Answer guest questions about hotel amenities. Always use get_amenities_info before answering. Keep responses concise and practical.',
  model,
  tools: [amenitiesTool]
});

export const databaseAgent = new Agent<HotelContext>({
  name: 'Guest Records Agent',
  handoffDescription: 'Looks up existing bookings, guest profile information, and billing invoices.',
  instructions: `Help guests with existing bookings, guest profile details, and billing.

If the guest asks about bookings or billing without identifying details, ask for a booking reference, name, email, or phone number.
When details are available, use query_hotel_database. Use table bookings for reservations, guests for loyalty/profile, and invoices for billing.
Do not invent booking information.`,
  model,
  tools: [databaseTool]
});

export const reservationAgent = new Agent<HotelContext>({
  name: 'Reservation Agent',
  handoffDescription: 'Creates new room reservations and asks for missing booking details.',
  instructions: `Create new hotel reservations.

Collect guest name, check-in date, check-out date, room type, and guest count if provided. Dates must be in YYYY-MM-DD format when calling the tool.
If any required field is missing, ask only for the missing fields.
Once enough information is available, call create_reservation and return its confirmation.`,
  model,
  tools: [reservationTool]
});

export const resolutionAgent = new Agent<HotelContext>({
  name: 'Booking Resolution Agent',
  handoffDescription: 'Handles booking changes such as room upgrades, date changes, early checkout, and guest count updates.',
  instructions: `Help guests modify an existing booking.

Ask for a booking reference if one is missing. Use update_booking only when the booking reference and requested change are clear.
Supported changes: room_type, guests, check_in, check_out. Dates must be YYYY-MM-DD.`,
  model,
  tools: [databaseTool, updateBookingTool]
});

export const wifiAgent = new Agent<HotelContext>({
  name: 'WiFi Agent',
  handoffDescription: 'Provides WiFi and internet connection information.',
  instructions: 'Reply exactly with: Free high-speed WiFi is available throughout the hotel.\nNetwork: GrandHorizon_Guest\nPassword: Your room key provides access',
  model
});

export const checkoutAgent = new Agent<HotelContext>({
  name: 'Checkout Agent',
  handoffDescription: 'Provides checkout time, late checkout, and express checkout policies.',
  instructions: 'Reply exactly with: Standard checkout is 11:00 AM.\nLate checkout ($50) available until 2:00 PM.\nExpress checkout available - settle your bill the night before.',
  model
});

export const emergencyAgent = new Agent<HotelContext>({
  name: 'Emergency Agent',
  handoffDescription: 'Provides emergency contacts, medical help, security, and urgent assistance information.',
  instructions: 'Reply exactly with: Emergency: 911\nFront Desk: Ext. 100\nMedical: Ext. 102\nSecurity: Ext. 103',
  model
});

export const generalAgent = new Agent<HotelContext>({
  name: 'General Concierge Agent',
  handoffDescription: 'Handles general hotel questions, recommendations, directions, transportation, greetings, and polite small talk.',
  instructions: 'You are a helpful hotel concierge for Grand Horizon Hotel. Be concise, warm, and practical. If a guest asks about hotel data handled by a specialist, answer generally and suggest asking for rooms, dining, amenities, bookings, WiFi, checkout, or emergency help.',
  model
});
