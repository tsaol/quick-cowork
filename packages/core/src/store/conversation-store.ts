import type Database from 'better-sqlite3';
import type { Conversation, ChatMessage, FileAttachment } from '@quick-cowork/shared';

export class ConversationStore {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  listConversations(): Conversation[] {
    const rows = this.db
      .prepare('SELECT id, title, created_at, updated_at FROM conversations ORDER BY updated_at DESC')
      .all() as { id: string; title: string; created_at: number; updated_at: number }[];

    return rows.map((r) => ({
      id: r.id,
      title: r.title,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));
  }

  createConversation(title: string): Conversation {
    const id = crypto.randomUUID();
    const now = Date.now();

    this.db
      .prepare('INSERT INTO conversations (id, title, created_at, updated_at) VALUES (?, ?, ?, ?)')
      .run(id, title, now, now);

    return { id, title, createdAt: now, updatedAt: now };
  }

  deleteConversation(id: string): void {
    this.db.prepare('DELETE FROM messages WHERE conversation_id = ?').run(id);
    this.db.prepare('DELETE FROM conversations WHERE id = ?').run(id);
  }

  getMessages(conversationId: string): ChatMessage[] {
    const rows = this.db
      .prepare('SELECT id, role, content, timestamp, attachments FROM messages WHERE conversation_id = ? ORDER BY timestamp ASC')
      .all(conversationId) as { id: string; role: string; content: string; timestamp: number; attachments: string | null }[];

    return rows.map((r) => ({
      id: r.id,
      role: r.role as ChatMessage['role'],
      content: r.content,
      timestamp: r.timestamp,
      attachments: r.attachments ? JSON.parse(r.attachments) as FileAttachment[] : undefined,
    }));
  }

  addMessage(conversationId: string, message: ChatMessage): void {
    const attachmentsJson = message.attachments ? JSON.stringify(message.attachments) : null;

    this.db
      .prepare('INSERT INTO messages (id, conversation_id, role, content, timestamp, attachments) VALUES (?, ?, ?, ?, ?, ?)')
      .run(message.id, conversationId, message.role, message.content, message.timestamp, attachmentsJson);

    // Update conversation timestamp and auto-title
    this.db
      .prepare('UPDATE conversations SET updated_at = ? WHERE id = ?')
      .run(Date.now(), conversationId);

    if (message.role === 'user') {
      const conv = this.db
        .prepare('SELECT title FROM conversations WHERE id = ?')
        .get(conversationId) as { title: string } | undefined;

      if (conv && conv.title === 'New Chat') {
        const newTitle = message.content.slice(0, 50) + (message.content.length > 50 ? '...' : '');
        this.db
          .prepare('UPDATE conversations SET title = ? WHERE id = ?')
          .run(newTitle, conversationId);
      }
    }
  }

  updateTitle(conversationId: string, title: string): void {
    this.db
      .prepare('UPDATE conversations SET title = ? WHERE id = ?')
      .run(title, conversationId);
  }
}
