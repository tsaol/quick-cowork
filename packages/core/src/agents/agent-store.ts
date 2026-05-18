import type Database from 'better-sqlite3';
import type { AgentDefinition } from '@quick-cowork/shared';

interface AgentRow {
  id: string;
  name: string;
  instructions: string;
  tools: string;
  model: string | null;
  temperature: number | null;
  created_at: number;
  updated_at: number;
}

function rowToAgent(row: AgentRow): AgentDefinition {
  let tools: string[] = [];
  try {
    tools = row.tools ? (JSON.parse(row.tools) as string[]) : [];
  } catch {
    tools = [];
  }
  return {
    id: row.id,
    name: row.name,
    instructions: row.instructions,
    tools,
    model: row.model ?? undefined,
    temperature: row.temperature ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export type AgentInput = Omit<AgentDefinition, 'id' | 'createdAt' | 'updatedAt'>;

export class AgentStore {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  list(): AgentDefinition[] {
    const rows = this.db
      .prepare(
        'SELECT id, name, instructions, tools, model, temperature, created_at, updated_at FROM agents ORDER BY updated_at DESC',
      )
      .all() as AgentRow[];
    return rows.map(rowToAgent);
  }

  get(id: string): AgentDefinition | null {
    const row = this.db
      .prepare(
        'SELECT id, name, instructions, tools, model, temperature, created_at, updated_at FROM agents WHERE id = ?',
      )
      .get(id) as AgentRow | undefined;
    return row ? rowToAgent(row) : null;
  }

  create(input: AgentInput): AgentDefinition {
    const id = crypto.randomUUID();
    const now = Date.now();
    const agent: AgentDefinition = {
      id,
      name: input.name,
      instructions: input.instructions,
      tools: input.tools ?? [],
      model: input.model,
      temperature: input.temperature,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        'INSERT INTO agents (id, name, instructions, tools, model, temperature, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        agent.id,
        agent.name,
        agent.instructions,
        JSON.stringify(agent.tools),
        agent.model ?? null,
        agent.temperature ?? null,
        agent.createdAt,
        agent.updatedAt,
      );

    return agent;
  }

  update(id: string, input: Partial<AgentInput>): AgentDefinition {
    const existing = this.get(id);
    if (!existing) {
      throw new Error(`Agent not found: ${id}`);
    }

    const next: AgentDefinition = {
      ...existing,
      name: input.name ?? existing.name,
      instructions: input.instructions ?? existing.instructions,
      tools: input.tools ?? existing.tools,
      model: input.model !== undefined ? input.model : existing.model,
      temperature: input.temperature !== undefined ? input.temperature : existing.temperature,
      updatedAt: Date.now(),
    };

    this.db
      .prepare(
        'UPDATE agents SET name = ?, instructions = ?, tools = ?, model = ?, temperature = ?, updated_at = ? WHERE id = ?',
      )
      .run(
        next.name,
        next.instructions,
        JSON.stringify(next.tools),
        next.model ?? null,
        next.temperature ?? null,
        next.updatedAt,
        id,
      );

    return next;
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM agents WHERE id = ?').run(id);
  }
}
