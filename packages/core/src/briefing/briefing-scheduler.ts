import type { BriefingConfig, DailyBriefing, AppSettings } from '@quick-cowork/shared';
import type { BriefingGenerator } from './briefing-generator.js';
import type { BriefingStore } from './briefing-store.js';

export interface BriefingSchedulerDeps {
  generator: BriefingGenerator;
  store: BriefingStore;
  getSettings: () => AppSettings;
  onBriefingReady?: (briefing: DailyBriefing) => void;
}

const CHECK_INTERVAL_MS = 60_000;

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export class BriefingScheduler {
  private deps: BriefingSchedulerDeps;
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastFiredDate = '';

  constructor(deps: BriefingSchedulerDeps) {
    this.deps = deps;
  }

  start(): void {
    if (this.timer) return;
    this.tick();
    this.timer = setInterval(() => this.tick(), CHECK_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  restart(): void {
    this.stop();
    this.lastFiredDate = '';
    const config = this.getConfig();
    if (config.enabled) {
      this.start();
    }
  }

  private getConfig(): BriefingConfig {
    const settings = this.deps.getSettings();
    return (
      settings.briefing || {
        enabled: false,
        time: '08:00',
        includeCalendar: true,
        includeGmail: true,
        includeMemories: true,
      }
    );
  }

  private tick(): void {
    const config = this.getConfig();
    if (!config.enabled) return;

    const today = todayKey();
    if (this.lastFiredDate === today) return;

    if (!this.matchesTime(config.time)) return;

    this.lastFiredDate = today;
    void this.fire();
  }

  private matchesTime(hhmm: string): boolean {
    const [hStr, mStr] = hhmm.split(':');
    const targetH = Number(hStr);
    const targetM = Number(mStr);
    if (Number.isNaN(targetH) || Number.isNaN(targetM)) return false;
    const now = new Date();
    return now.getHours() === targetH && now.getMinutes() === targetM;
  }

  private async fire(): Promise<void> {
    try {
      const briefing = await this.deps.generator.generate();
      this.deps.store.save(briefing);
      this.deps.onBriefingReady?.(briefing);
    } catch (err) {
      console.error('[BriefingScheduler] generation failed:', err);
    }
  }
}
