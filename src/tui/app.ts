import blessed from 'blessed';
import * as fs from 'fs';
import * as path from 'path';
import { SkillRouter } from '../router/skill_router';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class TUIApp {
  private screen: any;
  private chatBox: any;
  private inputBox: any;
  private router: SkillRouter;
  private messages: ChatMessage[] = [];
  private isProcessing: boolean = false;
  private logFile: string;

  constructor(router: SkillRouter) {
    this.router = router;
    this.logFile = path.resolve(process.cwd(), 'conversation.log');

    this.screen = blessed.screen({
      smartCSR: true,
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
      tags: true
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

    this.inputBox.focus();
    this.screen.render();

    this.inputBox.on('submit', () => {
      if (this.isProcessing) return;
      
      const text = this.inputBox.getValue();
      if (!text || !text.trim()) return;
      
      this.inputBox.clearValue();
      this.handleUserInput(text);
    });

    this.screen.key(['escape', 'q', 'C-c'], () => {
      process.exit(0);
    });

    this.screen.key('f2', () => {
      this.saveConversation();
    });
  }

  private saveConversation(): void {
    const content = this.messages.map(m => 
      `${m.role === 'user' ? 'You' : 'Concierge'}: ${m.content}`
    ).join('\n\n');
    
    fs.writeFileSync(this.logFile, content, 'utf-8');
    this.chatBox.pushLine('{yellow}Conversation saved to conversation.log{/yellow}');
    this.screen.render();
  }

  private handleUserInput(text: string): void {
    this.isProcessing = true;
    
    // Add user message to messages
    this.messages.push({ role: 'user', content: text });
    this.addMessage('user', text);

    this.addMessage('assistant', 'Thinking...');

    this.router.route(text).then(response => {
      // Add assistant response
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

  private addMessage(role: 'user' | 'assistant', content: string): void {
    const prefix = role === 'user' ? 'You: ' : 'Concierge: ';
    const formatted = content.split('\n').map(line => `${prefix}${line}`).join('\n');
    this.chatBox.pushLine(formatted);
    this.chatBox.setScrollPerc(100);
    this.screen.render();
  }

  private updateLastMessage(content: string): void {
    const lines = this.chatBox.getContent().split('\n');
    if (lines.length > 0) {
      const prefix = 'Concierge: ';
      const formatted = content.split('\n').join(`\n${prefix}`);
      lines[lines.length - 1] = `${prefix}${formatted}`;
      this.chatBox.setContent(lines.join('\n'));
      this.chatBox.setScrollPerc(100);
      this.screen.render();
    }
  }

  public showWelcome(): void {
    const welcome = `
{bold}{yellow}Welcome to Hotel Concierge AI{/yellow}{/bold}

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
    this.screen.render();
  }

  public run(): void {
    this.screen.render();
  }
}