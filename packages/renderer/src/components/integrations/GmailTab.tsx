import { useEffect, useState } from 'react';
import { Mail, Send, Loader2, RefreshCw, Pencil, X } from 'lucide-react';
import type { GmailMessage } from '../../types';

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString();
}

export function GmailTab() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [messages, setMessages] = useState<GmailMessage[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [composeOpen, setComposeOpen] = useState(false);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const refreshStatus = async () => {
    try {
      const status = await window.quickCowork.integrations.oauthStatus();
      setConnected(status.gmail);
      if (status.gmail) {
        await loadMessages();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read status');
      setConnected(false);
    }
  };

  const loadMessages = async (q?: string) => {
    setLoading(true);
    setError(null);
    try {
      const list = await window.quickCowork.integrations.gmailList(q || undefined, 25);
      setMessages(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load messages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshStatus();
  }, []);

  const handleConnect = async () => {
    setOauthLoading(true);
    setError(null);
    try {
      await window.quickCowork.integrations.oauthStart('gmail');
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth failed');
    } finally {
      setOauthLoading(false);
    }
  };

  const handleSend = async () => {
    if (!to.trim() || !subject.trim() || !body.trim()) return;
    setSending(true);
    setError(null);
    setInfo(null);
    try {
      await window.quickCowork.integrations.gmailSend(
        to.trim(),
        subject.trim(),
        body.trim(),
      );
      setInfo('Email sent');
      setComposeOpen(false);
      setTo('');
      setSubject('');
      setBody('');
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
        Checking Gmail status...
      </div>
    );
  }

  if (!connected) {
    return (
      <div
        data-testid="gmail-not-connected"
        className="flex flex-col items-center justify-center h-full px-6 text-center"
      >
        <Mail size={48} className="text-zinc-600 mb-4" />
        <h3 className="text-lg font-medium text-zinc-100 mb-2">Gmail not connected</h3>
        <p className="text-sm text-zinc-400 mb-4 max-w-md">
          Connect your Google account to read and send emails. You will be redirected to
          a browser to grant access.
        </p>
        <button
          onClick={handleConnect}
          disabled={oauthLoading}
          data-testid="gmail-connect-button"
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 text-white transition-colors"
        >
          {oauthLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Mail size={16} />
          )}
          Connect Gmail
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 space-y-4" data-testid="gmail-connected">
      <div className="flex items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && loadMessages(query)}
          placeholder="Search query (e.g. is:unread)"
          className="flex-1 px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
        />
        <button
          onClick={() => loadMessages(query)}
          disabled={loading}
          data-testid="gmail-refresh-button"
          className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <RefreshCw size={14} />
          )}
          Refresh
        </button>
        <button
          onClick={() => setComposeOpen(true)}
          data-testid="gmail-compose-button"
          className="flex items-center gap-1 px-3 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Pencil size={14} />
          Compose
        </button>
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

      {loading && messages.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-zinc-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : messages.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
          <Mail size={32} className="mb-2 opacity-50" />
          <p className="text-sm">No messages found</p>
        </div>
      ) : (
        <div className="space-y-2" data-testid="gmail-message-list">
          {messages.map((m) => (
            <div
              key={m.id}
              className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg hover:border-zinc-600 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-zinc-400 truncate">{m.from}</p>
                  <h4 className="text-sm font-medium text-zinc-100 truncate">
                    {m.subject || '(no subject)'}
                  </h4>
                  <p className="text-xs text-zinc-500 line-clamp-2 mt-1">
                    {m.body.slice(0, 200)}
                  </p>
                </div>
                <span className="text-xs text-zinc-600 shrink-0">
                  {formatDate(m.date)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {composeOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => !sending && setComposeOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-lg p-5 space-y-3"
            data-testid="gmail-compose-modal"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-zinc-100">New email</h3>
              <button
                onClick={() => !sending && setComposeOpen(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X size={18} />
              </button>
            </div>
            <input
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="To"
              className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
            />
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
            />
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={8}
              placeholder="Message body"
              className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setComposeOpen(false)}
                disabled={sending}
                className="px-3 py-2 text-sm rounded-lg text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !to.trim() || !subject.trim() || !body.trim()}
                data-testid="gmail-send-button"
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-white"
              >
                {sending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
