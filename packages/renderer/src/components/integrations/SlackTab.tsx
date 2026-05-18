import { useEffect, useState } from 'react';
import { MessageSquare, Send, Loader2, RefreshCw } from 'lucide-react';
import type { SlackChannel } from '../../types';

export function SlackTab() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const refreshStatus = async () => {
    try {
      const status = await window.quickCowork.integrations.oauthStatus();
      setConnected(status.slack);
      if (status.slack) {
        await loadChannels();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read status');
      setConnected(false);
    }
  };

  const loadChannels = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await window.quickCowork.integrations.slackChannels();
      setChannels(list);
      if (list.length > 0 && !selectedChannel) {
        setSelectedChannel(list[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load channels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleSend = async () => {
    if (!selectedChannel || !text.trim()) return;
    setSending(true);
    setError(null);
    setInfo(null);
    try {
      await window.quickCowork.integrations.slackSend(selectedChannel, text.trim());
      setInfo('Message sent');
      setText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  if (connected === null) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500">
        <Loader2 size={20} className="animate-spin mr-2" />
        Checking Slack status...
      </div>
    );
  }

  if (!connected) {
    return (
      <div
        data-testid="slack-not-connected"
        className="flex flex-col items-center justify-center h-full px-6 text-center"
      >
        <MessageSquare size={48} className="text-zinc-600 mb-4" />
        <h3 className="text-lg font-medium text-zinc-100 mb-2">Slack not connected</h3>
        <p className="text-sm text-zinc-400 mb-4 max-w-md">
          Add your Slack bot token in Settings → Integrations to send messages and list
          channels. Once configured, this tab will let you post to any channel your bot
          can access.
        </p>
        <button
          onClick={refreshStatus}
          data-testid="slack-refresh"
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition-colors"
        >
          <RefreshCw size={16} />
          Re-check status
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 space-y-4" data-testid="slack-connected">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-zinc-100">Send to Slack</h2>
        <button
          onClick={loadChannels}
          disabled={loading}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded-md text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <RefreshCw size={12} />
          )}
          Refresh channels
        </button>
      </div>

      <div className="space-y-2">
        <label className="block text-xs text-zinc-400">Channel</label>
        <select
          value={selectedChannel}
          onChange={(e) => setSelectedChannel(e.target.value)}
          data-testid="slack-channel-select"
          className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
        >
          {channels.length === 0 && <option value="">No channels available</option>}
          {channels.map((c) => (
            <option key={c.id} value={c.id}>
              #{c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="block text-xs text-zinc-400">Message</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          placeholder="Type your message..."
          data-testid="slack-message-input"
          className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
        />
      </div>

      {error && (
        <div className="px-3 py-2 text-sm bg-red-900/30 border border-red-800 rounded-lg text-red-300">
          {error}
        </div>
      )}
      {info && (
        <div className="px-3 py-2 text-sm bg-green-900/30 border border-green-800 rounded-lg text-green-300">
          {info}
        </div>
      )}

      <button
        onClick={handleSend}
        disabled={sending || !selectedChannel || !text.trim()}
        data-testid="slack-send-button"
        className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white transition-colors"
      >
        {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        Send
      </button>
    </div>
  );
}
