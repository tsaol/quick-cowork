import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_SETTINGS } from '@quick-cowork/shared';
import type { AppSettings } from '@quick-cowork/shared';

export class SettingsStore {
  private settings: AppSettings;
  private filePath: string;

  constructor(dataDir: string) {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.filePath = path.join(dataDir, 'settings.json');
    this.settings = this.load();
  }

  private load(): AppSettings {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {
      // fall through
    }
    return { ...DEFAULT_SETTINGS };
  }

  private save(): void {
    fs.writeFileSync(this.filePath, JSON.stringify(this.settings, null, 2));
  }

  get(): AppSettings {
    return { ...this.settings };
  }

  set(partial: Partial<AppSettings>): AppSettings {
    this.settings = { ...this.settings, ...partial };
    if (partial.apiKeys) {
      this.settings.apiKeys = { ...this.settings.apiKeys, ...partial.apiKeys };
    }
    this.save();
    return this.get();
  }
}
