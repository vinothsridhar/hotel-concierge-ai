import * as fs from 'fs';
import * as path from 'path';
import { SkillContext, SkillResponse } from '../router/types';
import { LLMClient } from '../services/openai_client';

export class LLMSkill {
  private openai: LLMClient;
  private dataCache: Map<string, unknown> = new Map();

  constructor(openai: LLMClient) {
    this.openai = openai;
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

  async execute(context: SkillContext): Promise<SkillResponse> {
    const { query, skill, context_data } = context;

    if (skill.name === 'discrepancy' && context_data) {
      const bookingId = context_data['booking_id'];
      if (bookingId) {
        const data = this.loadData('data/bookings.json') as { tables: Record<string, unknown[]> };
        const bookings = data.tables['bookings'] as Record<string, unknown>[];
        const booking = bookings.find(b => b['id'] === bookingId);
        
        if (booking) {
          const systemPrompt = `You are a hotel concierge. A guest has reported a booking discrepancy.
          
Booking details from our system:
- Booking ID: ${booking['id']}
- Room Type: ${booking['room_type']}
- Check-in: ${booking['check_in']}
- Check-out: ${booking['check_out']}
- Total Paid: $${booking['total_paid']}
- Status: ${booking['status']}

The guest says: "${query}"

Analyze the discrepancy and provide a helpful response that:
1. Acknowledges their concern
2. Explains what our system shows
3. Offers specific resolution options (upgrade, date change, refund, speak to manager)
4. Ask if they'd like to proceed with any option

Be concise and empathetic.`;
          
          const response = await this.openai.chat({
            model: '',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: query }]
          });
          
          return {
            skill: skill.name,
            response
          };
        }
      }
      return {
        skill: skill.name,
        response: "I understand there's a discrepancy with your booking. Could you provide your booking reference number so I can look into this for you?"
      };
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
          
Current booking:
- Booking ID: ${bookingId}
- Room Type: ${currentRoom}
- Check-in: ${checkIn}
- Check-out: ${checkOut}
- Total Paid: $${totalPaid}
- Nights: ${nights}

Available rooms and prices per night:
${Object.entries(roomPrices).map(([name, price]) => `- ${name}: $${price}/night`).join('\n')}

Guest request: "${query}"

Analyze the guest's request and determine what action they want. Common actions:
- upgrade: guest wants a better room (higher price)
- downgrade: guest wants a cheaper room (lower price)
- date_change: guest wants to change dates
- extend_stay: guest wants to stay longer
- early_checkout: guest wants to leave earlier
- guest_count_change: guest wants to add or remove guests

Return ONLY valid JSON with this structure:
{
  "action": "upgrade|downgrade|date_change|extend_stay|early_checkout|guest_count_change|none",
  "new_room": "Standard|Deluxe|Executive Suite|Family Suite|Presidential Suite" (for room changes),
  "new_guest_count": number (for guest count changes),
  "reason": "brief explanation of the change"
}

If the request is not a modification (e.g., just asking questions), return action: "none".`;

          const llmResponse = await this.openai.chat({
            model: '',
            messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: query }]
          });
          
          const jsonMatch = llmResponse.match(/\{[\s\S]*\}/);
          let actionResult = { action: 'none', new_room: '', new_guest_count: 0, reason: '' };
          
          if (jsonMatch) {
            try {
              actionResult = JSON.parse(jsonMatch[0]);
            } catch (e) {}
          }
          
          let roomChange = false;
          let guestCountChange = false;
          let finalRoom = currentRoom;
          let finalGuestCount = booking['guests'];
          let resolutionResponse = '';
          
          if (actionResult.new_room && actionResult.new_room !== currentRoom) {
            roomChange = true;
            finalRoom = actionResult.new_room;
          }
          
          if (actionResult.new_guest_count && actionResult.new_guest_count !== booking['guests']) {
            guestCountChange = true;
            finalGuestCount = actionResult.new_guest_count;
          }
          
          if (roomChange || guestCountChange) {
            const updates: string[] = [];
            
            if (roomChange && actionResult.new_room) {
              const newPrice = roomPrices[actionResult.new_room] || 0;
              const currentPrice = roomPrices[currentRoom] || 0;
              const priceDiff = (newPrice - currentPrice) * nights;
              
              bookings[bookingIndex] = { ...booking, room_type: actionResult.new_room };
              
              if (priceDiff < 0) {
                updates.push(`Room downgraded to ${actionResult.new_room} - Refund: $${Math.abs(priceDiff)}`);
              } else if (priceDiff > 0) {
                updates.push(`Room upgraded to ${actionResult.new_room} - Additional: $${priceDiff}`);
              } else {
                updates.push(`Room changed to ${actionResult.new_room} (no price change)`);
              }
            }
            
            if (guestCountChange && actionResult.new_guest_count) {
              bookings[bookingIndex] = { ...bookings[bookingIndex], guests: actionResult.new_guest_count };
              updates.push(`Guest count updated to ${actionResult.new_guest_count}`);
            }
            
            this.saveData('data/bookings.json', data);
            
            resolutionResponse = `I've successfully processed your changes.\n\n` +
              `Updated Booking Details:\n` +
              `- Booking ID: ${bookingId}\n` +
              `- Room Type: ${finalRoom}\n` +
              `- Guests: ${finalGuestCount}\n` +
              `- Check-in: ${checkIn}\n` +
              `- Check-out: ${checkOut}\n` +
              `- Status: Confirmed\n\n` +
              `Changes:\n` +
              updates.map(u => `- ${u}`).join('\n') + '\n\n' +
              `Is there anything else I can help you with?`;
          } else if (actionResult.action === 'date_change' || actionResult.action === 'extend_stay' || actionResult.action === 'early_checkout') {
            resolutionResponse = `I understand you'd like to ${actionResult.action.replace('_', ' ')}.\n\n` +
              `Your current booking:\n` +
              `- Check-in: ${checkIn}\n` +
              `- Check-out: ${checkOut}\n\n` +
              `To proceed with this change, could you please provide the new check-in or check-out date you'd prefer?`;
          } else if (actionResult.action === 'guest_count_change') {
            resolutionResponse = `I understand you'd like to change the guest count.\n\n` +
              `Your current booking has ${booking['guests']} guest(s).\n\n` +
              `Could you please specify the new guest count you'd like?`;
          } else {
            resolutionResponse = `I understand you're asking about your booking. Your current booking details are:\n\n` +
              `- Room: ${currentRoom}\n` +
              `- Check-in: ${checkIn}\n` +
              `- Check-out: ${checkOut}\n\n` +
              `If you'd like to make any changes (upgrade, downgrade, date change), just let me know!`;
          }
          
          return {
            skill: skill.name,
            response: resolutionResponse
          };
        }
      }
      return {
        skill: skill.name,
        response: "I need your booking reference to process this request. Could you provide your booking ID?"
      };
    }

    const response = await this.openai.chat({
      model: '',
      messages: [{ role: 'user', content: query }]
    });
    
    return {
      skill: skill.name,
      response
    };
  }
}