import blessed from 'blessed';
import * as fs from 'fs';
import * as path from 'path';
import { HotelAgentService } from '../agents';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class TUIApp {
  private screen: any;
  private chatBox: any;
  private inputBox: any;
  private agentService: HotelAgentService;
  private messages: ChatMessage[] = [];
  private isProcessing: boolean = false;
  private logFile: string;

  constructor(agentService: HotelAgentService) {
    this.agentService = agentService;
    this.logFile = path.resolve(process.cwd(), 'conversation.log');

    this.screen = blessed.screen({
      smartCSR: true,
      mouse: true,
      title: 'Hotel Concierge AI'
    });

    this.chatBox = blessed.box({
      top: 0,
      left: 0,
      width: '100%',
      height: '90%',
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      tags: true,
      vi: true,
      keys: false,
      focusable: false
    });

    this.inputBox = blessed.textbox({
      bottom: 0,
      left: 0,
      width: '100%',
      height: '10%',
      border: { type: 'line' },
      style: { border: { fg: 'blue' } },
      input: true,
      keys: true
    });

    this.setupUI();
  }

  private setupUI(): void {
    const container = blessed.box({
      width: '100%',
      height: '100%'
    });

    container.append(this.chatBox);
    container.append(this.inputBox);

    this.screen.append(container);

    this.inputBox.on('submit', () => {
      if (this.isProcessing) return;
      
      const text = this.inputBox.getValue();
      if (!text || !text.trim()) {
        this.render();
        return;
      }
      
      this.inputBox.clearValue();
      this.handleUserInput(text);
    });

    const exit = () => this.exit();

    this.screen.key(['escape', 'q', 'C-c'], exit);
    this.inputBox.key(['escape', 'C-c'], exit);
    process.once('SIGINT', exit);

    this.screen.key('f2', () => {
      this.saveConversation();
    });

    this.chatBox.on('click', () => {
      this.focusInput();
    });

    this.screen.on('click', () => {
      this.focusInput();
    });

    this.focusInput();
  }

  private focusInput(): void {
    if (this.screen.focused !== this.inputBox) {
      this.inputBox.focus();
    }
    this.screen.render();
  }

  private render(): void {
    this.screen.render();
  }

  private saveConversation(): void {
    const content = this.messages.map(m => 
      `${m.role === 'user' ? 'You' : 'Concierge'}: ${m.content}`
    ).join('\n\n');
    
    fs.writeFileSync(this.logFile, content, 'utf-8');
    this.chatBox.pushLine('Conversation saved to conversation.log');
    this.render();
  }

  private exit(): void {
    this.screen.destroy();
    process.exit(0);
  }

  private handleUserInput(text: string): void {
    this.isProcessing = true;
    
    this.messages.push({ role: 'user', content: text });
    this.addMessage('user', text);

    this.addMessage('assistant', 'Thinking...');

    this.agentService.route(text).then(response => {
      this.messages.push({ role: 'assistant', content: response.response });
      this.updateLastMessage(response.response);
      this.isProcessing = false;
    }).catch((e: any) => {
      const errorMsg = 'Sorry, I encountered an error. Please try again.';
      this.messages.push({ role: 'assistant', content: errorMsg });
      this.updateLastMessage(errorMsg);
      this.isProcessing = false;
    });
  }

  private parseMarkdown(text: string): string {
    let parsed = text;

    parsed = parsed.replace(/^### (.+)$/gm, '$1');
    parsed = parsed.replace(/^## (.+)$/gm, '$1');
    parsed = parsed.replace(/^# (.+)$/gm, '$1');

    parsed = parsed.replace(/\*\*(.+?)\*\*/g, '$1');
    parsed = parsed.replace(/\*(.+?)\*/g, '$1');

    parsed = parsed.replace(/^- (.+)$/gm, '  - $1');
    parsed = parsed.replace(/^\d+\. (.+)$/gm, '  $1');

    parsed = parsed.replace(/`(.+?)`/g, '$1');

    parsed = parsed.replace(/\[(.+?)\]\((.+?)\)/g, '$1');

    return parsed;
  }

  private addMessage(role: 'user' | 'assistant', content: string): void {
    const prefix = role === 'user' ? 'You: ' : 'Concierge: ';
    const formatted = this.parseMarkdown(content);
    const lines = formatted.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = i === 0 ? prefix + lines[i] : '  ' + lines[i];
      this.chatBox.pushLine(line);
    }
    
    this.chatBox.setScrollPerc(100);
    this.render();
  }

  private updateLastMessage(content: string): void {
    const content_lines = this.chatBox.getContent().split('\n');
    const parsed = this.parseMarkdown(content);
    const lines = parsed.split('\n');
    const prefix = 'Concierge: ';
    
    const newLines: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      newLines.push((i === 0 ? prefix : '  ') + lines[i]);
    }
    
    content_lines.splice(-1, 1, ...newLines);
    this.chatBox.setContent(content_lines.join('\n'));
    this.chatBox.setScrollPerc(100);
    this.render();
  }

  public showWelcome(): void {
    const welcome = `
Welcome to Hotel Concierge AI

How may I assist you today?
- Room information and pricing
- Dining options and reservations  
- Hotel amenities and facilities
- Your booking details
- WiFi and checkout info

Type your question or press Enter.
Press F2 to save conversation.
`;
    this.chatBox.pushLine(welcome);
    this.render();
  }

  public run(): void {
    this.render();
  }
}
