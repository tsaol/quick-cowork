import type Database from 'better-sqlite3';
import type { DailyBriefing, BriefingSection } from '@quick-cowork/shared';

interface BriefingRow {
  id: string;
  date: string;
  summary: string;
  sections: string;
  generated_at: number;
}

function rowToBriefing(row: BriefingRow): DailyBriefing {
  let sections: BriefingSection[] = [];
  try {
    sections = JSON.parse(row.sections) as BriefingSection[];
  } catch {
    sections = [];
  }
  return {
    id: row.id,
    date: row.date,
    summary: row.summary,
    sections,
    generatedAt: row.generated_at,
  };
}

export class BriefingStore {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  save(briefing: DailyBriefing): void {
    this.db
      .prepare(
        `INSERT OR REPLACE INTO briefings (id, date, summary, sections, generated_at)
         VALUES (?, ?, ?, ?, ?)`,
      )
      .run(
        briefing.id,
        briefing.date,
        briefing.summary,
        JSON.stringify(briefing.sections),
        briefing.generatedAt,
      );
  }

  getLatest(): DailyBriefing | null {
    const row = this.db
      .prepare(
        'SELECT id, date, summary, sections, generated_at FROM briefings ORDER BY generated_at DESC LIMIT 1',
      )
      .get() as BriefingRow | undefined;
    return row ? rowToBriefing(row) : null;
  }

  getByDate(date: string): DailyBriefing | null {
    const row = this.db
      .prepare(
        'SELECT id, date, summary, sections, generated_at FROM briefings WHERE date = ?',
      )
      .get(date) as BriefingRow | undefined;
    return row ? rowToBriefing(row) : null;
  }
}
