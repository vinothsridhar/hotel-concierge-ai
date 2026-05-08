import * as fs from 'fs';
import * as path from 'path';
import { tool } from '@openai/agents';
import { z } from 'zod';
import { BookingsDatabase } from '../types';

const reservationSchema = z.object({
  name: z.string().optional().describe('Guest full name'),
  check_in: z.string().optional().describe('Check-in date in YYYY-MM-DD format'),
  check_out: z.string().optional().describe('Check-out date in YYYY-MM-DD format'),
  room_type: z.string().optional().describe('Room type, such as Standard, Deluxe, Executive Suite, Family Suite, or Presidential Suite'),
  guests: z.number().optional().describe('Number of guests')
});

interface PricesData {
  rooms: Record<string, { price_per_night: number; description: string }>;
}

function readJson<T>(relativePath: string): T {
  return JSON.parse(fs.readFileSync(path.resolve(process.cwd(), relativePath), 'utf-8')) as T;
}

function writeJson(relativePath: string, data: unknown): void {
  fs.writeFileSync(path.resolve(process.cwd(), relativePath), JSON.stringify(data, null, 2));
}

function normalizeRoomType(roomType: string): string {
  const normalized = roomType.toLowerCase();
  if (normalized.includes('presidential')) return 'Presidential Suite';
  if (normalized.includes('family')) return 'Family Suite';
  if (normalized.includes('executive')) return 'Executive Suite';
  if (normalized.includes('deluxe')) return 'Deluxe';
  return 'Standard';
}

export function createReservation(input: z.infer<typeof reservationSchema>): string {
  const missing = ['name', 'check_in', 'check_out', 'room_type'].filter(field => !input[field as keyof typeof input]);
  if (missing.length > 0) {
    return `To complete your reservation, I still need: ${missing.join(', ')}. Please ask the guest for those details.`;
  }

  const roomType = normalizeRoomType(input.room_type!);
  const prices = readJson<PricesData>('data/prices.json');
  const roomPrice = prices.rooms[roomType]?.price_per_night || 200;
  const nights = Math.max(1, Math.ceil((new Date(input.check_out!).getTime() - new Date(input.check_in!).getTime()) / (1000 * 60 * 60 * 24)));
  const guests = input.guests || 2;
  const total = roomPrice * nights;

  const data = readJson<BookingsDatabase>('data/bookings.json');
  const guestId = 'G' + String(Date.now()).slice(-3);
  const bookingId = 'B' + String(Math.floor(1000 + Math.random() * 9000));

  data.tables.guests.push({
    id: guestId,
    name: input.name!,
    email: input.name!.toLowerCase().replace(/\s+/g, '.') + '@email.com',
    phone: '+1 555-0000',
    loyalty_tier: 'Bronze',
    notes: ''
  });

  data.tables.bookings.push({
    id: bookingId,
    guest_id: guestId,
    room_type: roomType,
    check_in: input.check_in!,
    check_out: input.check_out!,
    guests,
    status: 'confirmed',
    total_paid: total,
    balance_due: 0,
    special_requests: '',
    created_at: new Date().toISOString().split('T')[0]
  });

  writeJson('data/bookings.json', data);

  return `Your reservation is confirmed!\n\nBooking Reference: ${bookingId}\nGuest: ${input.name}\nRoom: ${roomType}\nCheck-in: ${input.check_in}\nCheck-out: ${input.check_out}\nGuests: ${guests}\nTotal: $${total}\n\nWe look forward to welcoming you!`;
}

export const reservationTool = tool({
  name: 'create_reservation',
  description: 'Create a new hotel room reservation when guest name, dates, room type, and optional guest count are known.',
  parameters: reservationSchema,
  execute: createReservation
});
