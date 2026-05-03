import { SkillResponse } from '../router/types';

export interface ReservationContext {
  status: 'pending' | 'collecting' | 'completed';
  name?: string;
  check_in?: string;
  check_out?: string;
  room_type?: string;
  guests?: number;
}

export class ReservationHandler {
  private context: ReservationContext = { status: 'pending' };
  private REQUIRED_FIELDS = ['name', 'check_in', 'check_out', 'room_type'];

  canHandle(query: string): boolean {
    const lower = query.toLowerCase();
    const isNewReservation = lower.includes('make') || lower.includes('new') || lower.includes('want to book') || lower.includes('reserve');
    return isNewReservation || this.context.status !== 'pending';
  }

  handle(query: string, executeSkill: (query: string, context: ReservationContext) => Promise<SkillResponse>): Promise<SkillResponse> {
    this.context.status = 'collecting';

    const missing = this.getMissingFields();
    const prompt = this.buildPrompt(missing);

    if (prompt.includes('check_in') || prompt.includes('check-out')) {
      const dates = this.extractDates(query);
      if (dates.check_in) this.context.check_in = dates.check_in;
      if (dates.check_out) this.context.check_out = dates.check_out;
    }
    if (prompt.includes('name')) {
      const name = this.extractName(query);
      if (name) this.context.name = name;
    }
    if (prompt.includes('room')) {
      const room = this.extractRoom(query);
      if (room) this.context.room_type = room;
    }
    if (prompt.includes('guest')) {
      const guests = this.extractGuests(query);
      if (guests) this.context.guests = guests;
    }

    if (this.isComplete()) {
      this.context.status = 'completed';
      return executeSkill('create reservation', this.context);
    }

    const stillMissing = this.getMissingFields();
    return Promise.resolve({
      skill: 'make_reservation' as const,
      response: this.buildPrompt(stillMissing)
    });
  }

  private isComplete(): boolean {
    return this.getMissingFields().length === 0;
  }

  private getMissingFields(): string[] {
    return this.REQUIRED_FIELDS.filter(f => !this.context[f as keyof ReservationContext]);
  }

  private buildPrompt(missing: string[]): string {
    const display = missing.map(f => f.replace('_', ' ')).join(', ');
    return `To complete your reservation, I still need: ${display}. Could you provide these?`;
  }

  private extractDates(query: string): { check_in?: string; check_out?: string } {
    const lower = query.toLowerCase();
    const currentYear = new Date().getFullYear();
    const months: Record<string, string> = {
      'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04', 'may': '05', 'jun': '06',
      'jul': '07', 'aug': '08', 'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
    };

    const checkInMatch = lower.match(/(?:check.in|from|arriv).*?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d+)/);
    const checkOutMatch = lower.match(/(?:check.out|to|leav).*?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d+)/);

    let check_in: string | undefined;
    let check_out: string | undefined;

    if (checkInMatch) {
      const month = months[checkInMatch[1].slice(0, 3)];
      check_in = `${currentYear}-${month}-${checkInMatch[2].padStart(2, '0')}`;
    }

    if (checkOutMatch) {
      const month = months[checkOutMatch[1].slice(0, 3)];
      check_out = `${currentYear}-${month}-${checkOutMatch[2].padStart(2, '0')}`;
    }

    if (!check_in && !check_out) {
      const mayMatch = lower.match(/may\s+(\d+)/g);
      if (mayMatch) {
        const dates = mayMatch.map(m => m.replace('may ', ''));
        if (dates[0]) check_in = `${currentYear}-05-${dates[0].padStart(2, '0')}`;
        if (dates[1]) check_out = `${currentYear}-05-${dates[1].padStart(2, '0')}`;
      }
    }

    return { check_in, check_out };
  }

  private extractName(query: string): string | undefined {
    const nameMatch = query.match(/(?:name is|name's|i'm|i am)\s+(\w+)/i);
    if (nameMatch) return nameMatch[1];

    const parts = query.split(' ');
    if (parts.length > 0 && parts[0] !== 'check-in' && parts[0] !== 'checkout') {
      return parts[parts.length - 1];
    }
    return undefined;
  }

  private extractRoom(query: string): string | undefined {
    const lower = query.toLowerCase();
    if (lower.includes('standard')) return 'Standard';
    if (lower.includes('deluxe')) return 'Deluxe';
    if (lower.includes('executive') || lower.includes('suite')) return 'Executive Suite';
    if (lower.includes('family')) return 'Family Suite';
    if (lower.includes('presidential')) return 'Presidential Suite';
    return undefined;
  }

  private extractGuests(query: string): number | undefined {
    const numMatch = query.match(/(\d+)\s*(?:guest|person|people)/i);
    if (numMatch) return parseInt(numMatch[1]);

    const wordNum: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6 };
    const wordMatch = query.match(/(one|two|three|four|five|six)\s*(?:guest|person|people)/i);
    if (wordMatch) return wordNum[wordMatch[1]];
    return undefined;
  }

  reset(): void {
    this.context = { status: 'pending' };
  }
}