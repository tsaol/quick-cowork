import { useEffect, useState } from 'react';
import { Coffee, RefreshCw, Calendar, Mail, Brain } from 'lucide-react';
import type { DailyBriefing, BriefingConfig, BriefingSection } from '../types';

const DEFAULT_CONFIG: BriefingConfig = {
  enabled: false,
  time: '08:00',
  includeCalendar: true,
  includeGmail: true,
  includeMemories: true,
};

function sectionIcon(source: BriefingSection['source']) {
  if (source === 'calendar') return <Calendar size={16} />;
  if (source === 'gmail') return <Mail size={16} />;
  return <Brain size={16} />;
}

export function BriefingView() {
  const [latest, setLatest] = useState<DailyBriefing | null>(null);
  const [config, setConfig] = useState<BriefingConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void load();
  }, []);

  async function load() {
    const [b, c] = await Promise.all([
      window.quickCowork.briefing.getLatest(),
      window.quickCowork.briefing.getConfig(),
    ]);
    setLatest(b);
    setConfig(c);
  }

  async function handleGenerate() {
    setLoading(true);
    try {
      const briefing = await window.quickCowork.briefing.generate();
      setLatest(briefing);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveConfig(next: BriefingConfig) {
    setSaving(true);
    try {
      const saved = await window.quickCowork.briefing.configure(next);
      setConfig(saved);
    } finally {
      setSaving(false);
    }
  }

  function updateConfig(patch: Partial<BriefingConfig>) {
    const next = { ...config, ...patch };
    setConfig(next);
    void handleSaveConfig(next);
  }

  return (
    <div
      data-testid="briefing-view"
      className="flex flex-col h-full bg-zinc-900 text-zinc-100 overflow-y-auto"
    >
      <div className="flex items-center justify-between border-b border-zinc-800 px-6 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <Coffee size={22} className="text-orange-400" />
          <div>
            <h1 className="text-lg font-semibold">Daily Briefing</h1>
            <p className="text-xs text-zinc-500">
              {latest ? latest.date : new Date().toISOString().slice(0, 10)}
            </p>
          </div>
        </div>
        <button
          data-testid="briefing-generate"
          onClick={handleGenerate}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-sm"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          {loading ? 'Generating...' : 'Generate Now'}
        </button>
      </div>

      <div className="px-6 py-4">
        <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 mb-6">
          <h2 className="text-sm font-medium text-zinc-300 mb-3">Settings</h2>
          <div className="space-y-3">
            <label className="flex items-center justify-between text-sm">
              <span>Enable scheduled briefing</span>
              <input
                type="checkbox"
                data-testid="briefing-enabled"
                checked={config.enabled}
                onChange={(e) => updateConfig({ enabled: e.target.checked })}
                disabled={saving}
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Time (HH:MM)</span>
              <input
                type="time"
                data-testid="briefing-time"
                value={config.time}
                onChange={(e) => updateConfig({ time: e.target.value })}
                disabled={saving}
                className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs"
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Include Calendar</span>
              <input
                type="checkbox"
                data-testid="briefing-include-calendar"
                checked={config.includeCalendar}
                onChange={(e) => updateConfig({ includeCalendar: e.target.checked })}
                disabled={saving}
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Include Gmail</span>
              <input
                type="checkbox"
                data-testid="briefing-include-gmail"
                checked={config.includeGmail}
                onChange={(e) => updateConfig({ includeGmail: e.target.checked })}
                disabled={saving}
              />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Include Memories</span>
              <input
                type="checkbox"
                data-testid="briefing-include-memories"
                checked={config.includeMemories}
                onChange={(e) => updateConfig({ includeMemories: e.target.checked })}
                disabled={saving}
              />
            </label>
          </div>
        </div>

        {latest ? (
          <div data-testid="briefing-content" className="space-y-4">
            <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-4">
              <h2 className="text-sm font-medium text-zinc-400 mb-2">Summary</h2>
              <p className="text-sm leading-relaxed text-zinc-200 whitespace-pre-wrap">
                {latest.summary}
              </p>
            </div>

            {latest.sections.map((section) => (
              <div
                key={section.title}
                data-testid={`briefing-section-${section.source}`}
                className="bg-zinc-950 border border-zinc-800 rounded-lg p-4"
              >
                <div className="flex items-center gap-2 mb-2 text-zinc-300">
                  {sectionIcon(section.source)}
                  <h3 className="text-sm font-medium">{section.title}</h3>
                  <span className="text-xs text-zinc-500">({section.items.length})</span>
                </div>
                {section.items.length === 0 ? (
                  <p className="text-xs text-zinc-500">Nothing to show.</p>
                ) : (
                  <ul className="space-y-1.5 text-sm text-zinc-300">
                    {section.items.map((item, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-zinc-600">•</span>
                        <span className="flex-1">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div
            data-testid="briefing-empty"
            className="bg-zinc-950 border border-zinc-800 rounded-lg p-8 text-center"
          >
            <Coffee size={32} className="mx-auto text-zinc-600 mb-3" />
            <p className="text-sm text-zinc-400">No briefing yet.</p>
            <p className="text-xs text-zinc-500 mt-1">
              Click &quot;Generate Now&quot; to create your first briefing.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
