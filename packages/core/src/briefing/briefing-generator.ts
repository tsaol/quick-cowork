import type {
  DailyBriefing,
  BriefingSection,
  BriefingConfig,
  AppSettings,
} from '@quick-cowork/shared';
import type { IntegrationManager } from '../integrations/integration-manager.js';
import type { MemoryStore } from '../memory/memory-store.js';
import type { ProviderManager } from '../llm/manager.js';

export interface BriefingGeneratorDeps {
  integrationManager: IntegrationManager;
  getMemoryStore: () => MemoryStore;
  providerManager: ProviderManager;
  getSettings: () => AppSettings;
}

const DEFAULT_CONFIG: BriefingConfig = {
  enabled: false,
  time: '08:00',
  includeCalendar: true,
  includeGmail: true,
  includeMemories: true,
};

function todayDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export class BriefingGenerator {
  private deps: BriefingGeneratorDeps;

  constructor(deps: BriefingGeneratorDeps) {
    this.deps = deps;
  }

  async generate(): Promise<DailyBriefing> {
    const settings = this.deps.getSettings();
    const config: BriefingConfig = { ...DEFAULT_CONFIG, ...(settings.briefing || {}) };
    const sections: BriefingSection[] = [];

    if (config.includeCalendar && this.deps.integrationManager.calendar.isConfigured()) {
      try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        const events = await this.deps.integrationManager.calendar.listEvents(
          start.toISOString(),
          end.toISOString(),
        );
        sections.push({
          title: 'Calendar',
          source: 'calendar',
          items: events.map(
            (e) =>
              `${formatTime(e.start)} - ${formatTime(e.end)}: ${e.title}${e.location ? ` (${e.location})` : ''}`,
          ),
        });
      } catch (err) {
        console.error('[BriefingGenerator] calendar fetch failed:', err);
      }
    }

    if (config.includeGmail && this.deps.integrationManager.gmail.isConfigured()) {
      try {
        const emails = await this.deps.integrationManager.gmail.listEmails(
          'newer_than:1d',
          10,
        );
        sections.push({
          title: 'Recent Email',
          source: 'gmail',
          items: emails.map((e) => `${e.from}: ${e.subject}`),
        });
      } catch (err) {
        console.error('[BriefingGenerator] gmail fetch failed:', err);
      }
    }

    if (config.includeMemories) {
      try {
        const memories = this.deps.getMemoryStore().list(10);
        if (memories.length > 0) {
          sections.push({
            title: 'Recent Memories',
            source: 'memory',
            items: memories.map((m) => m.content.slice(0, 140)),
          });
        }
      } catch (err) {
        console.error('[BriefingGenerator] memory fetch failed:', err);
      }
    }

    const summary = await this.summarize(sections, settings);

    return {
      id: crypto.randomUUID(),
      date: todayDate(),
      summary,
      sections,
      generatedAt: Date.now(),
    };
  }

  private async summarize(
    sections: BriefingSection[],
    settings: AppSettings,
  ): Promise<string> {
    if (sections.length === 0) {
      return 'No data available. Configure integrations to get a richer briefing.';
    }

    const dataBlock = sections
      .map((s) => `${s.title}:\n${s.items.map((i) => `- ${i}`).join('\n')}`)
      .join('\n\n');

    const prompt = `You are a concise morning briefing assistant. Summarize the following information into a short, friendly paragraph (3-5 sentences) highlighting the most important items for the user's day.

${dataBlock}

Briefing:`;

    try {
      let response = '';
      for await (const chunk of this.deps.providerManager.chat(
        settings.provider,
        [{ role: 'user', content: prompt }],
        { model: settings.model, maxTokens: 400 },
      )) {
        if (chunk.type === 'text') {
          response += chunk.content;
        }
      }
      const trimmed = response.trim();
      return trimmed || this.fallbackSummary(sections);
    } catch (err) {
      console.error('[BriefingGenerator] LLM summarize failed:', err);
      return this.fallbackSummary(sections);
    }
  }

  private fallbackSummary(sections: BriefingSection[]): string {
    const parts: string[] = [];
    for (const s of sections) {
      parts.push(`${s.items.length} item(s) in ${s.title}`);
    }
    return `Today's briefing: ${parts.join(', ')}.`;
  }
}
