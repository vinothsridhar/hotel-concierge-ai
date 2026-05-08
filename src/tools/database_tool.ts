import * as fs from 'fs';
import * as path from 'path';
import { tool } from '@openai/agents';
import { z } from 'zod';
import { BookingRecord, BookingsDatabase, GuestRecord, InvoiceRecord } from '../types';

const dataPath = 'data/bookings.json';

const databaseQuerySchema = z.object({
  query: z.string().describe('Guest request or search terms'),
  table: z.enum(['bookings', 'guests', 'invoices']).describe('The database table to query'),
  booking_id: z.string().optional().describe('Booking reference like B1001'),
  name: z.string().optional().describe('Guest name'),
  email: z.string().optional().describe('Guest email'),
  phone: z.string().optional().describe('Guest phone')
});

const updateBookingSchema = z.object({
  booking_id: z.string().describe('Booking reference like B1001'),
  room_type: z.string().optional().describe('New room type'),
  guests: z.number().optional().describe('New guest count'),
  check_in: z.string().optional().describe('New check-in date in YYYY-MM-DD format'),
  check_out: z.string().optional().describe('New check-out date in YYYY-MM-DD format')
});

function loadBookingsDatabase(): BookingsDatabase {
  const fullPath = path.resolve(process.cwd(), dataPath);
  return JSON.parse(fs.readFileSync(fullPath, 'utf-8')) as BookingsDatabase;
}

function saveBookingsDatabase(data: BookingsDatabase): void {
  const fullPath = path.resolve(process.cwd(), dataPath);
  fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
}

function findGuest(data: BookingsDatabase, input: { name?: string; email?: string; phone?: string }): GuestRecord | undefined {
  return data.tables.guests.find(guest => {
    if (input.name && guest.name.toLowerCase().includes(input.name.toLowerCase())) return true;
    if (input.email && guest.email.toLowerCase() === input.email.toLowerCase()) return true;
    if (input.phone && guest.phone.includes(input.phone)) return true;
    return false;
  });
}

function formatBooking(booking: BookingRecord): string {
  return `Booking #${booking.id}\nGuest: ${booking.guest_id}\nRoom: ${booking.room_type}\nCheck-in: ${booking.check_in}\nCheck-out: ${booking.check_out}\nGuests: ${booking.guests}\nStatus: ${booking.status}\nPaid: $${booking.total_paid} | Balance: $${booking.balance_due}`;
}

function formatGuest(guest: GuestRecord): string {
  return `Guest: ${guest.name}\nEmail: ${guest.email}\nPhone: ${guest.phone}\nLoyalty: ${guest.loyalty_tier}\nNotes: ${guest.notes || 'None'}`;
}

function formatInvoice(invoice: InvoiceRecord): string {
  const items = invoice.items.map(item => `- ${item.description}: $${item.amount}`).join('\n');
  return `Invoice for booking ${invoice.booking_id}\n${items}\nPaid: $${invoice.paid}\nMethod: ${invoice.method}`;
}

export function queryHotelDatabase(input: z.infer<typeof databaseQuerySchema>): string {
  const data = loadBookingsDatabase();
  const guest = findGuest(data, input);

  if (input.table === 'bookings') {
    let bookings = data.tables.bookings;
    if (input.booking_id) bookings = bookings.filter(booking => booking.id.toLowerCase() === input.booking_id!.toLowerCase());
    if (guest) bookings = bookings.filter(booking => booking.guest_id === guest.id);

    if (bookings.length === 0) return 'No matching booking data found.';
    return bookings.map(formatBooking).join('\n\n') + '\n\nIs there anything else you\'d like to know about your booking?';
  }

  if (input.table === 'guests') {
    const guests = guest ? [guest] : data.tables.guests.filter(row => JSON.stringify(row).toLowerCase().includes(input.query.toLowerCase()));
    if (guests.length === 0) return 'No matching guest profile found.';
    return guests.map(formatGuest).join('\n\n');
  }

  let invoices = data.tables.invoices;
  if (input.booking_id) invoices = invoices.filter(invoice => invoice.booking_id.toLowerCase() === input.booking_id!.toLowerCase());
  if (guest) {
    const bookingIds = data.tables.bookings.filter(booking => booking.guest_id === guest.id).map(booking => booking.id);
    invoices = invoices.filter(invoice => bookingIds.includes(invoice.booking_id));
  }

  if (invoices.length === 0) return 'No matching billing data found.';
  return invoices.map(formatInvoice).join('\n\n');
}

export function updateBooking(input: z.infer<typeof updateBookingSchema>): string {
  const data = loadBookingsDatabase();
  const booking = data.tables.bookings.find(row => row.id.toLowerCase() === input.booking_id.toLowerCase());

  if (!booking) return `Booking ${input.booking_id} was not found.`;

  const changes: string[] = [];
  if (input.room_type) {
    booking.room_type = input.room_type;
    changes.push(`Room changed to ${input.room_type}`);
  }
  if (input.guests) {
    booking.guests = input.guests;
    changes.push(`Guests updated to ${input.guests}`);
  }
  if (input.check_in) {
    booking.check_in = input.check_in;
    changes.push(`Check-in changed to ${input.check_in}`);
  }
  if (input.check_out) {
    booking.check_out = input.check_out;
    changes.push(`Check-out changed to ${input.check_out}`);
  }

  if (changes.length === 0) return 'No supported booking changes were provided.';

  saveBookingsDatabase(data);
  return `Booking ${booking.id} updated.\n${changes.map(change => '- ' + change).join('\n')}`;
}

export const databaseTool = tool({
  name: 'query_hotel_database',
  description: 'Query guest bookings, guest profiles, and billing invoices by booking ID, name, email, or phone.',
  parameters: databaseQuerySchema,
  execute: queryHotelDatabase
});

export const updateBookingTool = tool({
  name: 'update_booking',
  description: 'Modify an existing booking room type, guest count, check-in date, or check-out date.',
  parameters: updateBookingSchema,
  execute: updateBooking
});
