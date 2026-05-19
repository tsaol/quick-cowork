import { useState, useEffect } from 'react';
import { ArrowLeft, Save, FolderPlus, X, Folder } from 'lucide-react';
import type { AppSettings } from '../types';
import { PROVIDER_MODELS } from '../types';

interface SettingsViewProps {
  onBack: () => void;
}

export function SettingsView({ onBack }: SettingsViewProps) {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [allowedFolders, setAllowedFolders] = useState<string[]>([]);

  useEffect(() => {
    window.quickCowork.settings.get().then((s) => {
      setSettings(s);
      setAllowedFolders(s.allowedFolders || []);
    });
  }, []);

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    await window.quickCowork.settings.set(settings);
    setSaving(false);
  };

  const handleAddFolder = async () => {
    const folder = await window.quickCowork.files.addFolder();
    if (folder) {
      setAllowedFolders((prev) => [...prev, folder]);
      if (settings) {
        setSettings({ ...settings, allowedFolders: [...allowedFolders, folder] });
      }
    }
  };

  const handleRemoveFolder = async (folderPath: string) => {
    await window.quickCowork.files.removeFolder(folderPath);
    const updated = allowedFolders.filter((f) => f !== folderPath);
    setAllowedFolders(updated);
    if (settings) {
      setSettings({ ...settings, allowedFolders: updated });
    }
  };

  if (!settings) return null;

  return (
    <div data-testid="settings-view" className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-zinc-800 draggable">
        <button
          onClick={onBack}
          data-testid="settings-back"
          className="p-2 rounded-lg hover:bg-zinc-800 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold">Settings</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-xl mx-auto space-y-6">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Provider</label>
            <select
              value={settings.provider}
              onChange={(e) => {
                const provider = e.target.value as AppSettings['provider'];
                const models = PROVIDER_MODELS[provider] || [];
                setSettings({ ...settings, provider, model: models[0] || '' });
              }}
              data-testid="settings-provider"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100"
            >
              <option value="anthropic">Anthropic</option>
              <option value="openai">OpenAI</option>
              <option value="bedrock">AWS Bedrock</option>
              <option value="ollama">Ollama</option>
              <option value="litellm">LiteLLM</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Model</label>
            <select
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              data-testid="settings-model"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100"
            >
              {(PROVIDER_MODELS[settings.provider] || []).map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {settings.provider === 'anthropic' && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Anthropic API Key
              </label>
              <input
                type="password"
                value={settings.apiKeys.anthropic || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    apiKeys: { ...settings.apiKeys, anthropic: e.target.value },
                  })
                }
                data-testid="settings-anthropic-key"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100"
                placeholder="sk-ant-..."
              />
            </div>
          )}

          {settings.provider === 'openai' && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">OpenAI API Key</label>
              <input
                type="password"
                value={settings.apiKeys.openai || ''}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    apiKeys: { ...settings.apiKeys, openai: e.target.value },
                  })
                }
                data-testid="settings-openai-key"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100"
                placeholder="sk-..."
              />
            </div>
          )}

          {settings.provider === 'ollama' && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Ollama Host</label>
              <input
                type="text"
                value={settings.ollamaHost || ''}
                onChange={(e) => setSettings({ ...settings, ollamaHost: e.target.value })}
                data-testid="settings-ollama-host"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100"
                placeholder="http://localhost:11434"
              />
            </div>
          )}

          {settings.provider === 'bedrock' && (
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">AWS Region</label>
              <input
                type="text"
                value={settings.awsRegion || ''}
                onChange={(e) => setSettings({ ...settings, awsRegion: e.target.value })}
                data-testid="settings-aws-region"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100"
                placeholder="us-east-1"
              />
            </div>
          )}

          {settings.provider === 'litellm' && (
            <>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  LiteLLM Base URL
                </label>
                <input
                  type="text"
                  value={settings.litellmBaseUrl || ''}
                  onChange={(e) => setSettings({ ...settings, litellmBaseUrl: e.target.value })}
                  data-testid="settings-litellm-url"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100"
                  placeholder="http://localhost:4000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  LiteLLM API Key
                </label>
                <input
                  type="password"
                  value={settings.apiKeys.litellm || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      apiKeys: { ...settings.apiKeys, litellm: e.target.value },
                    })
                  }
                  data-testid="settings-litellm-key"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100"
                  placeholder="sk-litellm (optional)"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">Theme</label>
            <select
              value={settings.theme}
              onChange={(e) =>
                setSettings({ ...settings, theme: e.target.value as AppSettings['theme'] })
              }
              data-testid="settings-theme"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100"
            >
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </div>

          {/* File Access Section */}
          <div className="border-t border-zinc-800 pt-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-zinc-300">Allowed Folders</label>
              <button
                onClick={handleAddFolder}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg transition-colors"
              >
                <FolderPlus size={14} />
                Add Folder
              </button>
            </div>
            <p className="text-xs text-zinc-500 mb-3">
              Only files within these folders can be attached to messages.
            </p>
            {allowedFolders.length === 0 ? (
              <div className="text-center py-4 text-xs text-zinc-600 border border-dashed border-zinc-700 rounded-lg">
                No folders added yet. Add a folder to enable file attachments.
              </div>
            ) : (
              <div className="space-y-2">
                {allowedFolders.map((folder) => (
                  <div
                    key={folder}
                    className="flex items-center justify-between px-3 py-2 bg-zinc-800 rounded-lg border border-zinc-700"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder size={14} className="text-blue-400 shrink-0" />
                      <span className="text-xs text-zinc-300 truncate">{folder}</span>
                    </div>
                    <button
                      onClick={() => handleRemoveFolder(folder)}
                      className="ml-2 p-1 text-zinc-500 hover:text-red-400 transition-colors shrink-0"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            data-testid="settings-save"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
