import * as fs from 'fs';
import * as path from 'path';
import { SkillContext, SkillResponse } from '../router/types';

export class DocumentSkill {
  async execute(context: SkillContext): Promise<SkillResponse> {
    const { query, skill } = context;
    
    if (!skill.data_source) {
      return { skill: skill.name, response: 'No data source configured.' };
    }

    const dataPath = path.resolve(process.cwd(), skill.data_source);
    const content = fs.readFileSync(dataPath, 'utf-8');
    
    const queryLower = query.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    
    if (queryWords.some(w => w.includes('room') || w.includes('suite') || w.includes('bed'))) {
      const lines = content.split('\n');
      const results: string[] = [];
      let inRoom = false;
      let roomHeader = '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('### ')) {
          inRoom = true;
          roomHeader = trimmed;
          results.push('\n' + trimmed);
        } else if (trimmed.startsWith('# ') || trimmed.startsWith('## ')) {
          inRoom = false;
        } else if (inRoom && trimmed) {
          results.push(trimmed);
        }
        
        if (results.length > 30) break;
      }
      
      if (results.length > 0) {
        return {
          skill: skill.name,
          response: results.join('\n'),
          source: skill.data_source
        };
      }
    }
    
    const lines = content.split('\n');
    const relevantLines: string[] = [];
    
    for (let i = 0; i < lines.length; i++) {
      const lineLower = lines[i].toLowerCase();
      const hasMatch = queryWords.some(word => lineLower.includes(word));
      if (hasMatch) {
        const start = Math.max(0, i - 1);
        const end = Math.min(lines.length, i + 4);
        for (let j = start; j < end; j++) {
          const trimmed = lines[j].trim();
          if (trimmed) relevantLines.push(trimmed);
        }
      }
    }

    const response = relevantLines.length > 0
      ? relevantLines.slice(0, 20).join('\n')
      : content.substring(0, 500);

    return {
      skill: skill.name,
      response,
      source: skill.data_source
    };
  }
}