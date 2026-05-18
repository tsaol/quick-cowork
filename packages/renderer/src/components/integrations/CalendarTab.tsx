import { useEffect, useState } from 'react';
import { Calendar, Loader2, RefreshCw, Plus, X, MapPin, Clock } from 'lucide-react';
import type { CalendarEvent } from '../../types';

function toDatetimeLocal(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): number {
  return new Date(value).getTime();
}

function formatRange(start: number, end: number): string {
  const s = new Date(start);
  const e = new Date(end);
  const sameDay = s.toDateString() === e.toDateString();
  const dateStr = s.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const timeFmt: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
  if (sameDay) {
    return `${dateStr}  ·  ${s.toLocaleTimeString([], timeFmt)} – ${e.toLocaleTimeString([], timeFmt)}`;
  }
  return `${dateStr} ${s.toLocaleTimeString([], timeFmt)} → ${e.toLocaleDateString()} ${e.toLocaleTimeString([], timeFmt)}`;
}

export function CalendarTab() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const defaultStart = new Date();
  defaultStart.setMinutes(0, 0, 0);
  defaultStart.setHours(defaultStart.getHours() + 1);
  const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState(toDatetimeLocal(defaultStart.getTime()));
  const [end, setEnd] = useState(toDatetimeLocal(defaultEnd.getTime()));
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [creating, setCreating] = useState(false);

  const refreshStatus = async () => {
    try {
      const status = await window.quickCowork.integrations.oauthStatus();
      setConnected(status.calendar);
      if (status.calendar) {
        await loadEvents();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to read status');
      setConnected(false);
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await window.quickCowork.integrations.calendarList();
      setEvents(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load events');
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
      await window.quickCowork.integrations.oauthStart('calendar');
      await refreshStatus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'OAuth failed');
    } finally {
      setOauthLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!title.trim() || !start || !end) return;
    setCreating(true);
    setError(null);
    setInfo(null);
    try {
      await window.quickCowork.integrations.calendarCreate({
        title: title.trim(),
        start: fromDatetimeLocal(start),
        end: fromDatetimeLocal(end),
        description: description.trim() || undefined,
        location: location.trim() || undefined,
      });
      setInfo('Event created');
      setCreateOpen(false);
      setTitle('');
      setDescription('');
      setLocation('');
      await loadEvents();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setCreating(false);
    }
  };

  if (connected === null) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-500">
        <Loader2 size={20} className="animate-spin mr-2" />
        Checking Calendar status...
      </div>
    );
  }

  if (!connected) {
    return (
      <div
        data-testid="calendar-not-connected"
        className="flex flex-col items-center justify-center h-full px-6 text-center"
      >
        <Calendar size={48} className="text-zinc-600 mb-4" />
        <h3 className="text-lg font-medium text-zinc-100 mb-2">
          Calendar not connected
        </h3>
        <p className="text-sm text-zinc-400 mb-4 max-w-md">
          Connect your Google account to view and create calendar events. You will be
          redirected to a browser to grant access.
        </p>
        <button
          onClick={handleConnect}
          disabled={oauthLoading}
          data-testid="calendar-connect-button"
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-green-600 hover:bg-green-700 disabled:bg-zinc-700 text-white transition-colors"
        >
          {oauthLoading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Calendar size={16} />
          )}
          Connect Calendar
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 space-y-4" data-testid="calendar-connected">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-zinc-100">Upcoming events</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={loadEvents}
            disabled={loading}
            data-testid="calendar-refresh-button"
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            Refresh
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            data-testid="calendar-create-button"
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus size={12} />
            Create event
          </button>
        </div>
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

      {loading && events.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-zinc-500">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
          <Calendar size={32} className="mb-2 opacity-50" />
          <p className="text-sm">No upcoming events</p>
        </div>
      ) : (
        <ol
          className="relative border-l border-zinc-800 ml-3 space-y-4"
          data-testid="calendar-event-list"
        >
          {events.map((e) => (
            <li key={e.id} className="ml-6">
              <span className="absolute -left-[7px] mt-2 w-3 h-3 rounded-full bg-blue-500 ring-4 ring-zinc-900" />
              <div className="p-3 bg-zinc-800 border border-zinc-700 rounded-lg">
                <h4 className="text-sm font-medium text-zinc-100">
                  {e.title || '(untitled)'}
                </h4>
                <p className="flex items-center gap-1 text-xs text-zinc-400 mt-1">
                  <Clock size={12} />
                  {formatRange(e.start, e.end)}
                </p>
                {e.location && (
                  <p className="flex items-center gap-1 text-xs text-zinc-500 mt-1">
                    <MapPin size={12} />
                    {e.location}
                  </p>
                )}
                {e.description && (
                  <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                    {e.description}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}

      {createOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => !creating && setCreateOpen(false)}
        >
          <div
            onClick={(ev) => ev.stopPropagation()}
            className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-lg p-5 space-y-3"
            data-testid="calendar-create-modal"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-zinc-100">New event</h3>
              <button
                onClick={() => !creating && setCreateOpen(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X size={18} />
              </button>
            </div>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title"
              className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
            />
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs text-zinc-400">Start</label>
                <input
                  type="datetime-local"
                  value={start}
                  onChange={(e) => setStart(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs text-zinc-400">End</label>
                <input
                  type="datetime-local"
                  value={end}
                  onChange={(e) => setEnd(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Location (optional)"
              className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              placeholder="Description (optional)"
              className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setCreateOpen(false)}
                disabled={creating}
                className="px-3 py-2 text-sm rounded-lg text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !title.trim() || !start || !end}
                data-testid="calendar-submit-button"
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-white"
              >
                {creating ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plus size={16} />
                )}
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
