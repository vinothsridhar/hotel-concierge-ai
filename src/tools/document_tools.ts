import * as fs from 'fs';
import * as path from 'path';
import { tool } from '@openai/agents';
import { z } from 'zod';

const documentQuerySchema = z.object({
  query: z.string().describe('The guest question or search terms')
});

function readDataFile(relativePath: string): string {
  const fullPath = path.resolve(process.cwd(), relativePath);
  return fs.readFileSync(fullPath, 'utf-8');
}

export function searchMarkdownDocument(relativePath: string, query: string): string {
  const content = readDataFile(relativePath);
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(word => word.length > 2);

  if (queryWords.some(word => word.includes('room') || word.includes('suite') || word.includes('bed'))) {
    const lines = content.split('\n');
    const results: string[] = [];
    let inSection = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('### ')) {
        inSection = true;
        results.push('\n' + trimmed);
      } else if (trimmed.startsWith('# ') || trimmed.startsWith('## ')) {
        inSection = false;
      } else if (inSection && trimmed) {
        results.push(trimmed);
      }

      if (results.length > 30) break;
    }

    if (results.length > 0) return results.join('\n');
  }

  const lines = content.split('\n');
  const relevantLines: string[] = [];

  for (let index = 0; index < lines.length; index++) {
    const lineLower = lines[index].toLowerCase();
    const hasMatch = queryWords.some(word => lineLower.includes(word));
    if (hasMatch) {
      const start = Math.max(0, index - 1);
      const end = Math.min(lines.length, index + 4);
      for (let lineIndex = start; lineIndex < end; lineIndex++) {
        const trimmed = lines[lineIndex].trim();
        if (trimmed) relevantLines.push(trimmed);
      }
    }
  }

  return relevantLines.length > 0 ? relevantLines.slice(0, 20).join('\n') : content.substring(0, 700);
}

export function getRoomInfo(query: string): string {
  return searchMarkdownDocument('data/rooms.md', query);
}

export function getDiningInfo(query: string): string {
  return searchMarkdownDocument('data/menus.md', query);
}

export function getAmenitiesInfo(query: string): string {
  return searchMarkdownDocument('data/amenities.md', query);
}

export const roomsTool = tool({
  name: 'get_room_info',
  description: 'Get hotel room types, prices, beds, occupancy, and room amenities from the hotel room guide.',
  parameters: documentQuerySchema,
  execute: ({ query }) => getRoomInfo(query)
});

export const diningTool = tool({
  name: 'get_dining_info',
  description: 'Get restaurant menus, food options, dining hours, prices, and cuisine information.',
  parameters: documentQuerySchema,
  execute: ({ query }) => getDiningInfo(query)
});

export const amenitiesTool = tool({
  name: 'get_amenities_info',
  description: 'Get hotel facilities, pool, gym, spa, kids club, beach, and activity information.',
  parameters: documentQuerySchema,
  execute: ({ query }) => getAmenitiesInfo(query)
});
