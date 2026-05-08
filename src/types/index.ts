export interface HotelContext {
  bookingId?: string;
  guestId?: string;
}

export interface AgentRouteResponse {
  skill: string;
  response: string;
}

export interface BookingRecord {
  id: string;
  guest_id: string;
  room_type: string;
  check_in: string;
  check_out: string;
  guests: number;
  status: string;
  total_paid: number;
  balance_due: number;
  special_requests?: string;
  created_at: string;
}

export interface GuestRecord {
  id: string;
  name: string;
  email: string;
  phone: string;
  loyalty_tier: string;
  notes?: string;
}

export interface InvoiceRecord {
  booking_id: string;
  items: { description: string; amount: number }[];
  paid: number;
  method: string;
}

export interface BookingsDatabase {
  tables: {
    guests: GuestRecord[];
    bookings: BookingRecord[];
    invoices: InvoiceRecord[];
  };
}
