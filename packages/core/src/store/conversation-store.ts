import fs from 'node:fs';
import path from 'node:path';
import type { Conversation, ChatMessage } from '@quick-cowork/shared';

interface StoreData {
  conversations: Conversation[];
  messages: Record<string, ChatMessage[]>;
}

export class ConversationStore {
  private data: StoreData = { conversations: [], messages: {} };
  private filePath: string;

  constructor(dataDir: string) {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.filePath = path.join(dataDir, 'conversations.json');
    this.load();
  }

  private load(): void {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        this.data = JSON.parse(raw);
      }
    } catch {
      this.data = { conversations: [], messages: {} };
    }
  }

  private save(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2));
  }

  listConversations(): Conversation[] {
    return [...this.data.conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  createConversation(title: string): Conversation {
    const conv: Conversation = {
      id: crypto.randomUUID(),
      title,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.data.conversations.push(conv);
    this.data.messages[conv.id] = [];
    this.save();
    return conv;
  }

  deleteConversation(id: string): void {
    this.data.conversations = this.data.conversations.filter((c) => c.id !== id);
    delete this.data.messages[id];
    this.save();
  }

  getMessages(conversationId: string): ChatMessage[] {
    return this.data.messages[conversationId] || [];
  }

  addMessage(conversationId: string, message: ChatMessage): void {
    if (!this.data.messages[conversationId]) {
      this.data.messages[conversationId] = [];
    }
    this.data.messages[conversationId].push(message);

    const conv = this.data.conversations.find((c) => c.id === conversationId);
    if (conv) {
      conv.updatedAt = Date.now();
      if (message.role === 'user' && conv.title === 'New Chat') {
        conv.title = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
      }
    }
    this.save();
  }

  updateTitle(conversationId: string, title: string): void {
    const conv = this.data.conversations.find((c) => c.id === conversationId);
    if (conv) {
      conv.title = title;
      this.save();
    }
  }
}
