import type Database from 'better-sqlite3';
import type {
  KnowledgeGraph,
  Memory,
  MemoryEdge,
  MemorySearchResult,
} from '@quick-cowork/shared';
import { EmbeddingManager } from './embedding-manager.js';
import { VectorStore } from './vector-store.js';

interface MemoryRow {
  id: string;
  content: string;
  metadata: string;
  created_at: number;
  updated_at: number;
}

interface EdgeRow {
  id: string;
  source_id: string;
  target_id: string;
  relation: string;
  weight: number;
  created_at: number;
}

function rowToMemory(row: MemoryRow): Memory {
  let metadata: Record<string, unknown> = {};
  try {
    metadata = row.metadata ? (JSON.parse(row.metadata) as Record<string, unknown>) : {};
  } catch {
    metadata = {};
  }
  return {
    id: row.id,
    content: row.content,
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToEdge(row: EdgeRow): MemoryEdge {
  return {
    id: row.id,
    sourceId: row.source_id,
    targetId: row.target_id,
    relation: row.relation,
    weight: row.weight,
    createdAt: row.created_at,
  };
}

export class MemoryStore {
  private db: Database.Database;
  private embeddings: EmbeddingManager;
  private vectors: VectorStore;

  constructor(db: Database.Database, embeddings: EmbeddingManager) {
    this.db = db;
    this.embeddings = embeddings;
    this.vectors = new VectorStore(db, embeddings.getDimensions());
  }

  async store(content: string, metadata: Record<string, unknown> = {}): Promise<Memory> {
    const id = crypto.randomUUID();
    const now = Date.now();
    const memory: Memory = {
      id,
      content,
      metadata,
      createdAt: now,
      updatedAt: now,
    };

    this.db
      .prepare(
        'INSERT INTO memories (id, content, metadata, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      )
      .run(id, content, JSON.stringify(metadata), now, now);

    try {
      const embedding = await this.embeddings.embed(content);
      this.vectors.insert(id, embedding);
    } catch (err) {
      console.warn('[MemoryStore] failed to embed memory, stored without vector:', err);
    }

    return memory;
  }

  async search(query: string, limit = 10): Promise<MemorySearchResult[]> {
    let embedding: Float32Array;
    try {
      embedding = await this.embeddings.embed(query);
    } catch (err) {
      console.warn('[MemoryStore] embed failed, falling back to LIKE search:', err);
      return this.searchLike(query, limit);
    }

    const hits = this.vectors.search(embedding, limit);
    if (hits.length === 0) return [];

    const placeholders = hits.map(() => '?').join(',');
    const rows = this.db
      .prepare(
        `SELECT id, content, metadata, created_at, updated_at FROM memories WHERE id IN (${placeholders})`,
      )
      .all(...hits.map((h) => h.id)) as MemoryRow[];

    const byId = new Map(rows.map((r) => [r.id, rowToMemory(r)]));
    const results: MemorySearchResult[] = [];
    for (const hit of hits) {
      const mem = byId.get(hit.id);
      if (!mem) continue;
      results.push({ memory: mem, score: 1 - hit.distance });
    }
    return results;
  }

  private searchLike(query: string, limit: number): MemorySearchResult[] {
    const rows = this.db
      .prepare(
        'SELECT id, content, metadata, created_at, updated_at FROM memories WHERE content LIKE ? ORDER BY updated_at DESC LIMIT ?',
      )
      .all(`%${query}%`, limit) as MemoryRow[];
    return rows.map((row) => ({ memory: rowToMemory(row), score: 0 }));
  }

  async update(
    id: string,
    content: string,
    metadata?: Record<string, unknown>,
  ): Promise<Memory> {
    const now = Date.now();
    const existing = this.db
      .prepare('SELECT id, content, metadata, created_at, updated_at FROM memories WHERE id = ?')
      .get(id) as MemoryRow | undefined;
    if (!existing) {
      throw new Error(`Memory not found: ${id}`);
    }

    const mergedMetadata = metadata ?? rowToMemory(existing).metadata;
    this.db
      .prepare('UPDATE memories SET content = ?, metadata = ?, updated_at = ? WHERE id = ?')
      .run(content, JSON.stringify(mergedMetadata), now, id);

    try {
      const embedding = await this.embeddings.embed(content);
      this.vectors.insert(id, embedding);
    } catch (err) {
      console.warn('[MemoryStore] failed to re-embed memory:', err);
    }

    return {
      id,
      content,
      metadata: mergedMetadata,
      createdAt: existing.created_at,
      updatedAt: now,
    };
  }

  delete(id: string): void {
    this.vectors.delete(id);
    this.db.prepare('DELETE FROM memories WHERE id = ?').run(id);
  }

  getGraph(): KnowledgeGraph {
    const memoryRows = this.db
      .prepare('SELECT id, content, metadata, created_at, updated_at FROM memories')
      .all() as MemoryRow[];
    const edgeRows = this.db
      .prepare(
        'SELECT id, source_id, target_id, relation, weight, created_at FROM memory_edges',
      )
      .all() as EdgeRow[];
    return {
      nodes: memoryRows.map(rowToMemory),
      edges: edgeRows.map(rowToEdge),
    };
  }

  addEdge(sourceId: string, targetId: string, relation: string, weight = 1.0): MemoryEdge {
    const id = crypto.randomUUID();
    const now = Date.now();
    this.db
      .prepare(
        'INSERT INTO memory_edges (id, source_id, target_id, relation, weight, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(id, sourceId, targetId, relation, weight, now);
    return {
      id,
      sourceId,
      targetId,
      relation,
      weight,
      createdAt: now,
    };
  }

  removeEdge(id: string): void {
    this.db.prepare('DELETE FROM memory_edges WHERE id = ?').run(id);
  }

  list(limit = 100): Memory[] {
    const rows = this.db
      .prepare(
        'SELECT id, content, metadata, created_at, updated_at FROM memories ORDER BY updated_at DESC LIMIT ?',
      )
      .all(limit) as MemoryRow[];
    return rows.map(rowToMemory);
  }
}
