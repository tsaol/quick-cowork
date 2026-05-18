import type Database from 'better-sqlite3';
import { DEFAULT_SETTINGS } from '@quick-cowork/shared';
import type { AppSettings } from '@quick-cowork/shared';

export class SettingsStore {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  get(): AppSettings {
    const row = this.db
      .prepare("SELECT value FROM settings WHERE key = 'app_settings'")
      .get() as { value: string } | undefined;

    if (row) {
      try {
        const stored = JSON.parse(row.value) as Partial<AppSettings>;
        return { ...DEFAULT_SETTINGS, ...stored };
      } catch {
        return { ...DEFAULT_SETTINGS };
      }
    }

    return { ...DEFAULT_SETTINGS };
  }

  set(partial: Partial<AppSettings>): AppSettings {
    const current = this.get();
    const updated: AppSettings = { ...current, ...partial };

    if (partial.apiKeys) {
      updated.apiKeys = { ...current.apiKeys, ...partial.apiKeys };
    }

    this.db
      .prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('app_settings', ?)")
      .run(JSON.stringify(updated));

    return { ...updated };
  }
}
