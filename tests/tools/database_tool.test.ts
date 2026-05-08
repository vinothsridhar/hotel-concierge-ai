import { describe, expect, it } from 'vitest';
import { queryHotelDatabase } from '../../src/tools/database_tool';

describe('database tool helpers', () => {
  it('returns booking by booking ID', () => {
    const result = queryHotelDatabase({
      query: 'show booking B1001',
      table: 'bookings',
      booking_id: 'B1001'
    });

    expect(result).toContain('B1001');
    expect(result).toContain('Deluxe');
    expect(result).not.toContain('B1002');
  });

  it('returns booking by guest name', () => {
    const result = queryHotelDatabase({
      query: 'John Smith booking',
      table: 'bookings',
      name: 'John Smith'
    });

    expect(result).toContain('B1001');
  });

  it('returns guest profile by name', () => {
    const result = queryHotelDatabase({
      query: 'John Smith profile',
      table: 'guests',
      name: 'John Smith'
    });

    expect(result).toContain('John Smith');
    expect(result).toContain('Gold');
  });

  it('returns billing invoice by booking ID', () => {
    const result = queryHotelDatabase({
      query: 'billing for B1001',
      table: 'invoices',
      booking_id: 'B1001'
    });

    expect(result).toContain('800');
    expect(result).toContain('Credit Card');
  });
});
