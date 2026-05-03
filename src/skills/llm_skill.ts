import * as fs from 'fs';
import * as path from 'path';
import { SkillContext, SkillResponse } from '../router/types';
import { LLMClient } from '../services/openai_client';
import { SkillChain } from './skill_chain';

export class LLMSkill {
  private openai: LLMClient;
  private dataCache: Map<string, unknown> = new Map();
  private skillChain: SkillChain;

  constructor(openai: LLMClient, skillChain?: SkillChain) {
    this.openai = openai;
    this.skillChain = skillChain || new SkillChain(openai);
  }

  private loadData(filePath: string): unknown {
    if (this.dataCache.has(filePath)) {
      return this.dataCache.get(filePath);
    }
    const fullPath = path.resolve(process.cwd(), filePath);
    const content = fs.readFileSync(fullPath, 'utf-8');
    const data = JSON.parse(content);
    this.dataCache.set(filePath, data);
    return data;
  }

  private saveData(filePath: string, data: unknown): void {
    const fullPath = path.resolve(process.cwd(), filePath);
    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2));
    this.dataCache.set(filePath, data);
  }

  private async handleReservation(query: string, skill: any): Promise<SkillResponse> {
    const ctx = this.skillChain.reservationContext;

    const prompt = `Extract reservation details from this user message.

Current context: ${JSON.stringify(ctx)}

User message: "${query}"

Return JSON with fields you can extract: name, check_in (YYYY-MM-DD), check_out (YYYY-MM-DD), room_type (Standard/Deluxe/Executive Suite), guests (number)
Example: "may 5 to may 10" = check_in: "2026-05-05", check_out: "2026-05-10"`;

    const response = await this.openai.chat({
      model: '',
      messages: [{ role: 'system', content: prompt }, { role: 'user', content: query }]
    });

    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const extracted = JSON.parse(jsonMatch[0]);
      Object.assign(ctx, extracted);
    }

    const missing = ['name', 'check_in', 'check_out', 'room_type'].filter(f => !ctx[f as keyof typeof ctx]);

    if (missing.length > 0) {
      return {
        skill: skill.name,
        response: `To complete your reservation, I still need: ${missing.join(', ')}. Could you provide these?`
      };
    }

    const guests = ctx.guests || 2;
    const result = this.createBooking(ctx.name!, ctx.check_in!, ctx.check_out!, ctx.room_type!, guests);
    this.skillChain.reservationContext = {};
    return result;
  }

  private createBooking(name: string, checkIn: string, checkOut: string, roomType: string, guests: number): SkillResponse {
    const prices = this.loadData('data/prices.json') as { rooms: Record<string, { price_per_night: number }> };
    const roomPrice = prices.rooms[roomType]?.price_per_night || 200;
    const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
    const total = roomPrice * nights;

    const data = this.loadData('data/bookings.json') as { tables: Record<string, unknown[]> };
    const guestId = 'G' + String(Date.now()).slice(-3);
    const bookingId = 'B' + String(Math.floor(1000 + Math.random() * 9000));

    data.tables['guests'].push({
      id: guestId,
      name: name,
      email: name.toLowerCase().replace(' ', '.') + '@email.com',
      phone: '+1 555-0000',
      loyalty_tier: 'Bronze',
      notes: ''
    });

    data.tables['bookings'].push({
      id: bookingId,
      guest_id: guestId,
      room_type: roomType,
      check_in: checkIn,
      check_out: checkOut,
      guests: guests,
      status: 'confirmed',
      total_paid: total,
      balance_due: 0,
      special_requests: '',
      created_at: new Date().toISOString().split('T')[0]
    });

    this.saveData('data/bookings.json', data);

    return {
      skill: 'make_reservation',
      response: `Your reservation is confirmed!\n\nBooking Reference: ${bookingId}\nGuest: ${name}\nRoom: ${roomType}\nCheck-in: ${checkIn}\nCheck-out: ${checkOut}\nGuests: ${guests}\nTotal: $${total}\n\nWe look forward to welcoming you!`
    };
  }

  async execute(context: SkillContext): Promise<SkillResponse> {
    const { query, skill, context_data } = context;

    if (skill.name === 'make_reservation') {
      return this.handleReservation(query, skill);
    }

    if (skill.name === 'resolution' && context_data) {
      const bookingId = context_data['booking_id'];
      if (bookingId) {
        const data = this.loadData('data/bookings.json') as { tables: Record<string, unknown[]> };
        const bookings = data.tables['bookings'] as Record<string, unknown>[];
        const bookingIndex = bookings.findIndex(b => b['id'] === bookingId);
        const booking = bookings[bookingIndex];
        
        if (booking) {
          const prices = this.loadData('data/prices.json') as { rooms: Record<string, { price_per_night: number }> };
          const roomPrices: Record<string, number> = {};
          for (const [roomName, roomData] of Object.entries(prices.rooms)) {
            roomPrices[roomName] = roomData.price_per_night;
          }
          
          const currentRoom = String(booking['room_type']);
          const checkIn = String(booking['check_in']);
          const checkOut = String(booking['check_out']);
          const totalPaid = Number(booking['total_paid']);
          const nights = Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24));
          
          const systemPrompt = `You are a hotel concierge handling a booking modification request.
Current booking: ID ${bookingId}, Room ${currentRoom}, Check-in ${checkIn}, Check-out ${checkOut}, ${nights} nights, Paid $${totalPaid}
Available rooms: ${Object.entries(roomPrices).map(([name, price]) => `${name}: $${price}/night`).join(', ')}
Guest request: "${query}"
Return JSON: { "action": "upgrade|downgrade|date_change|guest_count_change|none", "new_room": "...", "new_guest_count": number, "new_check_in": "...", "new_check_out": "..." }`;

          const llmResponse = await this.openai.chat({
            model: '',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: query }]
          });

          const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
          let actionResult: { action: string; new_room: string; new_guest_count: number; new_check_in?: string; new_check_out?: string; reason: string } = { action: 'none', new_room: '', new_guest_count: 0, reason: '' };
          
          if (jsonMatch) {
            try { actionResult = JSON.parse(jsonMatch[0]); } catch (e) {}
          }

          let roomChange = false, guestCountChange = false, dateChange = false;
          let finalRoom = currentRoom, finalGuestCount = booking['guests'], finalCheckIn = checkIn, finalCheckOut = checkOut;
          const updates: string[] = [];
          
          if (actionResult.new_room && actionResult.new_room !== currentRoom) {
            roomChange = true;
            finalRoom = actionResult.new_room;
            const newPrice = roomPrices[actionResult.new_room] || 0;
            const currentPrice = roomPrices[currentRoom] || 0;
            const priceDiff = (newPrice - currentPrice) * nights;
            
            await this.skillChain.forward('database', {
              query: query,
              skill: { name: 'resolution', type: 'database', description: '' },
              context_data: { booking_id: bookingId, room_type: actionResult.new_room }
            });
            
            updates.push(priceDiff < 0 ? `Room downgraded to ${finalRoom} - Refund: $${Math.abs(priceDiff)}` : `Room changed to ${finalRoom}`);
          }
          
          if (actionResult.new_guest_count && actionResult.new_guest_count !== booking['guests']) {
            guestCountChange = true;
            finalGuestCount = actionResult.new_guest_count;
            await this.skillChain.forward('database', {
              query: query,
              skill: { name: 'resolution', type: 'database', description: '' },
              context_data: { booking_id: bookingId, guests: String(finalGuestCount) }
            });
            updates.push(`Guests updated to ${finalGuestCount}`);
          }
          
          if (actionResult.action === 'date_change' || actionResult.new_check_in || actionResult.new_check_out) {
            dateChange = true;
            finalCheckIn = actionResult.new_check_in || checkIn;
            finalCheckOut = actionResult.new_check_out || checkOut;
            await this.skillChain.forward('database', {
              query: query,
              skill: { name: 'resolution', type: 'database', description: '' },
              context_data: { booking_id: bookingId, check_in: finalCheckIn, check_out: finalCheckOut }
            });
            updates.push(`Dates: ${finalCheckIn} to ${finalCheckOut}`);
          }

          if (updates.length > 0) {
            return {
              skill: skill.name,
              response: `Changes processed:\n${updates.map(u => '- ' + u).join('\n')}\nBooking ${bookingId} updated.\n\nAnything else?`
            };
          }

          return {
            skill: skill.name,
            response: `Your booking:\nRoom: ${currentRoom}\nCheck-in: ${checkIn}\nCheck-out: ${checkOut}\n\nWhat would you like to change?`
          };
        }
      }
      return { skill: skill.name, response: "I need your booking ID." };
    }

    const response = await this.openai.chat({
      model: '',
      messages: [{ role: 'user', content: query }]
    });
    
    return { skill: skill.name, response };
  }
}