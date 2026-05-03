import * as fs from 'fs';
import * as path from 'path';
import { SkillContext, SkillResponse } from '../router/types';

export class DatabaseSkill {
  private dataCache: Map<string, unknown> = new Map();

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

  async execute(context: SkillContext): Promise<SkillResponse> {
    const { query, skill, context_data } = context;
    
    if (!skill.data_source) {
      return { skill: skill.name, response: 'No data source configured.' };
    }

    const data = this.loadData(skill.data_source) as { tables: Record<string, unknown[]> };
    const queryClean = query.toLowerCase().replace(/[^\w\s]/g, '');
    const results: string[] = [];

    const tableName = skill.name === 'bookings' || skill.name === 'change_booking' ? 'bookings' 
      : skill.name === 'billing' ? 'invoices'
      : skill.name === 'guest_info' ? 'guests'
      : null;

    if (tableName && data.tables[tableName]) {
      const table = data.tables[tableName] as Record<string, unknown>[];
      
      let matchedRows = table;
      
if (context_data && Object.keys(context_data).length > 0) {
        // If querying by guest name, first find guest ID
        if (context_data['name'] && tableName === 'bookings') {
          const guests = data.tables['guests'] as Record<string, unknown>[];
          const guestMatch = guests.find(g => 
            String(g['name'] || '').toLowerCase().includes(context_data['name'].toLowerCase())
          );
          if (guestMatch) {
            context_data['guest_id'] = String(guestMatch['id']);
          }
        }
        
        matchedRows = table.filter(row => {
          const rowAny = row as Record<string, unknown>;
          for (const [key, value] of Object.entries(context_data)) {
            // Check both direct field and aliases
            let rowValue = String(rowAny[key] || rowAny['id'] || rowAny['guest_id'] || '').toLowerCase();
            if (rowValue.includes(value.toLowerCase())) {
              return true;
            }
          }
          return false;
        });
      } else {
        const queryWords = queryClean.split(/\s+/).filter(w => w.length > 2);
        
        const isGeneralQuery = queryWords.some(w => 
          w === 'my' || w === 'all' || w === 'list' || w === 'show' || w === 'get' || w === 'about' || w === 'need' || w === 'know'
        );

        if (isGeneralQuery || queryWords.length <= 2) {
          matchedRows = table;
        } else {
          matchedRows = table.filter(row => {
            const rowStr = JSON.stringify(row).toLowerCase();
            return queryWords.some(word => rowStr.includes(word));
          });
        }
      }
      
      for (const row of matchedRows) {
        results.push(this.formatRow(row, skill.name));
      }
    }

    const response = results.length > 0
      ? results.join('\n\n')
      : `No matching ${skill.name} data found.`;

    return {
      skill: skill.name,
      response,
      source: skill.data_source
    };
  }

  private formatRow(row: Record<string, unknown>, type: string): string {
    if (type === 'bookings') {
      return `Booking #${row.id}
Guest: ${row.guest_id}
Room: ${row.room_type}
Check-in: ${row.check_in}
Check-out: ${row.check_out}
Guests: ${row.guests}
Status: ${row.status}
Paid: $${row.total_paid} | Balance: $${row.balance_due}`;
    }
    if (type === 'guest_info') {
      return `Guest: ${row.name}
Email: ${row.email}
Phone: ${row.phone}
Loyalty: ${row.loyalty_tier}
Notes: ${row.notes || 'None'}`;
    }
    return JSON.stringify(row, null, 2);
  }
}