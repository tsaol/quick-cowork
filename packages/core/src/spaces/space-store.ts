import type Database from 'better-sqlite3';
import type { Space, SpaceMember, SpaceMessage } from '@quick-cowork/shared';

interface SpaceRow {
  id: string;
  name: string;
  description: string;
  owner_id: string;
  created_at: number;
  updated_at: number;
}

interface MemberRow {
  space_id: string;
  user_id: string;
  user_name: string;
  role: string;
  last_seen: number | null;
}

interface MessageRow {
  id: string;
  space_id: string;
  sender_id: string;
  sender_name: string;
  content: string;
  type: string;
  timestamp: number;
}

const ONLINE_THRESHOLD_MS = 60_000;

export class SpaceStore {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  createSpace(
    name: string,
    description: string,
    ownerId: string,
    ownerName: string,
  ): Space {
    const id = crypto.randomUUID();
    const now = Date.now();

    this.db
      .prepare(
        'INSERT INTO spaces (id, name, description, owner_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(id, name, description, ownerId, now, now);

    this.db
      .prepare(
        'INSERT INTO space_members (space_id, user_id, user_name, role, last_seen) VALUES (?, ?, ?, ?, ?)',
      )
      .run(id, ownerId, ownerName, 'owner', now);

    return this.getSpace(id) as Space;
  }

  joinSpace(
    spaceId: string,
    userId: string,
    userName: string,
    role: 'editor' | 'viewer' = 'viewer',
  ): Space | null {
    const space = this.db
      .prepare('SELECT id FROM spaces WHERE id = ?')
      .get(spaceId) as { id: string } | undefined;
    if (!space) return null;

    const now = Date.now();
    this.db
      .prepare(
        'INSERT OR REPLACE INTO space_members (space_id, user_id, user_name, role, last_seen) VALUES (?, ?, ?, ?, ?)',
      )
      .run(spaceId, userId, userName, role, now);

    this.db
      .prepare('UPDATE spaces SET updated_at = ? WHERE id = ?')
      .run(now, spaceId);

    return this.getSpace(spaceId);
  }

  leaveSpace(spaceId: string, userId: string): void {
    this.db
      .prepare('DELETE FROM space_members WHERE space_id = ? AND user_id = ?')
      .run(spaceId, userId);
  }

  listSpaces(userId: string): Space[] {
    const rows = this.db
      .prepare(
        `SELECT s.* FROM spaces s
         INNER JOIN space_members m ON m.space_id = s.id
         WHERE m.user_id = ?
         ORDER BY s.updated_at DESC`,
      )
      .all(userId) as SpaceRow[];

    return rows.map((row) => this.rowToSpace(row));
  }

  getSpace(id: string): Space | null {
    const row = this.db
      .prepare('SELECT * FROM spaces WHERE id = ?')
      .get(id) as SpaceRow | undefined;
    if (!row) return null;
    return this.rowToSpace(row);
  }

  getMembers(spaceId: string): SpaceMember[] {
    const rows = this.db
      .prepare(
        'SELECT space_id, user_id, user_name, role, last_seen FROM space_members WHERE space_id = ?',
      )
      .all(spaceId) as MemberRow[];

    const now = Date.now();
    return rows.map((r) => ({
      id: r.user_id,
      name: r.user_name,
      role: r.role as SpaceMember['role'],
      online: r.last_seen != null && now - r.last_seen < ONLINE_THRESHOLD_MS,
      lastSeen: r.last_seen ?? 0,
    }));
  }

  invite(spaceId: string, userId: string, userName: string, role: 'editor' | 'viewer'): SpaceMember | null {
    const space = this.db
      .prepare('SELECT id FROM spaces WHERE id = ?')
      .get(spaceId) as { id: string } | undefined;
    if (!space) return null;

    const now = Date.now();
    this.db
      .prepare(
        'INSERT OR REPLACE INTO space_members (space_id, user_id, user_name, role, last_seen) VALUES (?, ?, ?, ?, ?)',
      )
      .run(spaceId, userId, userName, role, 0);

    this.db
      .prepare('UPDATE spaces SET updated_at = ? WHERE id = ?')
      .run(now, spaceId);

    return {
      id: userId,
      name: userName,
      role,
      online: false,
      lastSeen: 0,
    };
  }

  getMessages(spaceId: string, limit = 200): SpaceMessage[] {
    const rows = this.db
      .prepare(
        'SELECT * FROM space_messages WHERE space_id = ? ORDER BY timestamp ASC LIMIT ?',
      )
      .all(spaceId, limit) as MessageRow[];

    return rows.map((r) => ({
      id: r.id,
      spaceId: r.space_id,
      senderId: r.sender_id,
      senderName: r.sender_name,
      content: r.content,
      type: r.type as SpaceMessage['type'],
      timestamp: r.timestamp,
    }));
  }

  sendMessage(message: Omit<SpaceMessage, 'id' | 'timestamp'> & { id?: string; timestamp?: number }): SpaceMessage {
    const id = message.id ?? crypto.randomUUID();
    const timestamp = message.timestamp ?? Date.now();

    this.db
      .prepare(
        'INSERT INTO space_messages (id, space_id, sender_id, sender_name, content, type, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
      .run(id, message.spaceId, message.senderId, message.senderName, message.content, message.type, timestamp);

    this.db
      .prepare('UPDATE spaces SET updated_at = ? WHERE id = ?')
      .run(timestamp, message.spaceId);

    this.db
      .prepare('UPDATE space_members SET last_seen = ? WHERE space_id = ? AND user_id = ?')
      .run(timestamp, message.spaceId, message.senderId);

    return {
      id,
      spaceId: message.spaceId,
      senderId: message.senderId,
      senderName: message.senderName,
      content: message.content,
      type: message.type,
      timestamp,
    };
  }

  touchPresence(spaceId: string, userId: string): void {
    this.db
      .prepare('UPDATE space_members SET last_seen = ? WHERE space_id = ? AND user_id = ?')
      .run(Date.now(), spaceId, userId);
  }

  private rowToSpace(row: SpaceRow): Space {
    const members = this.getMembers(row.id);
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      ownerId: row.owner_id,
      members,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
