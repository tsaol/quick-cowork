import type Database from 'better-sqlite3';

export interface VectorSearchHit {
  id: string;
  distance: number;
}

/**
 * Vector store backed by sqlite-vec when available, falling back to
 * brute-force cosine similarity in JS if the extension cannot load.
 */
export class VectorStore {
  private db: Database.Database;
  private dimensions: number;
  private vecLoaded = false;
  private tableName: string;

  constructor(db: Database.Database, dimensions: number) {
    this.db = db;
    this.dimensions = dimensions;
    this.tableName = `memory_vec_${dimensions}`;
    this.tryLoadVec();
  }

  private tryLoadVec(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const sqliteVec = require('sqlite-vec') as { load: (db: Database.Database) => void };
      sqliteVec.load(this.db);
      this.db.exec(
        `CREATE VIRTUAL TABLE IF NOT EXISTS ${this.tableName} USING vec0(
          memory_id TEXT PRIMARY KEY,
          embedding FLOAT[${this.dimensions}]
        )`,
      );
      this.vecLoaded = true;
    } catch (err) {
      console.warn('[VectorStore] sqlite-vec unavailable, falling back to JS cosine:', err);
      this.vecLoaded = false;
    }
  }

  isVecEnabled(): boolean {
    return this.vecLoaded;
  }

  insert(memoryId: string, embedding: Float32Array): void {
    const buf = Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength);
    if (this.vecLoaded) {
      this.db
        .prepare(`INSERT OR REPLACE INTO ${this.tableName} (memory_id, embedding) VALUES (?, ?)`)
        .run(memoryId, buf);
    }
    this.db.prepare('UPDATE memories SET embedding = ? WHERE id = ?').run(buf, memoryId);
  }

  delete(memoryId: string): void {
    if (this.vecLoaded) {
      this.db.prepare(`DELETE FROM ${this.tableName} WHERE memory_id = ?`).run(memoryId);
    }
  }

  search(query: Float32Array, limit: number): VectorSearchHit[] {
    if (this.vecLoaded) {
      try {
        const buf = Buffer.from(query.buffer, query.byteOffset, query.byteLength);
        const rows = this.db
          .prepare(
            `SELECT memory_id as id, distance FROM ${this.tableName}
             WHERE embedding MATCH ? AND k = ?
             ORDER BY distance`,
          )
          .all(buf, limit) as { id: string; distance: number }[];
        return rows.map((r) => ({ id: r.id, distance: r.distance }));
      } catch (err) {
        console.warn('[VectorStore] vec search failed, falling back:', err);
      }
    }
    return this.searchBruteForce(query, limit);
  }

  private searchBruteForce(query: Float32Array, limit: number): VectorSearchHit[] {
    const rows = this.db
      .prepare('SELECT id, embedding FROM memories WHERE embedding IS NOT NULL')
      .all() as { id: string; embedding: Buffer }[];

    const hits: VectorSearchHit[] = [];
    for (const row of rows) {
      const emb = new Float32Array(
        row.embedding.buffer,
        row.embedding.byteOffset,
        row.embedding.byteLength / 4,
      );
      if (emb.length !== query.length) continue;
      const sim = cosineSimilarity(query, emb);
      hits.push({ id: row.id, distance: 1 - sim });
    }
    hits.sort((a, b) => a.distance - b.distance);
    return hits.slice(0, limit);
  }
}

function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}
