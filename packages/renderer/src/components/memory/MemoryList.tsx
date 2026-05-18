import { useEffect, useState } from 'react';
import { Search, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import type { Memory } from '../../types';

function formatDate(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString();
}

function metadataToText(meta: Record<string, unknown>): string {
  if (!meta || Object.keys(meta).length === 0) return '';
  try {
    return JSON.stringify(meta, null, 2);
  } catch {
    return '';
  }
}

function parseMetadata(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  if (!trimmed) return {};
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // try key=value lines
  }
  const result: Record<string, unknown> = {};
  for (const line of trimmed.split('\n')) {
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

export function MemoryList() {
  const [query, setQuery] = useState('');
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Memory | null>(null);
  const [contentDraft, setContentDraft] = useState('');
  const [metadataDraft, setMetadataDraft] = useState('');
  const [saving, setSaving] = useState(false);

  const runSearch = async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const results = await window.quickCowork.memory.search(q, 50);
      setMemories(results.map((r) => r.memory));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runSearch('');
  }, []);

  const openAddModal = () => {
    setEditing(null);
    setContentDraft('');
    setMetadataDraft('');
    setModalOpen(true);
  };

  const openEditModal = (m: Memory) => {
    setEditing(m);
    setContentDraft(m.content);
    setMetadataDraft(metadataToText(m.metadata));
    setModalOpen(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditing(null);
    setContentDraft('');
    setMetadataDraft('');
  };

  const handleSave = async () => {
    if (!contentDraft.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const meta = parseMetadata(metadataDraft);
      if (editing) {
        await window.quickCowork.memory.update(editing.id, contentDraft.trim(), meta);
      } else {
        await window.quickCowork.memory.store(contentDraft.trim(), meta);
      }
      setModalOpen(false);
      setEditing(null);
      setContentDraft('');
      setMetadataDraft('');
      await runSearch(query);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    try {
      await window.quickCowork.memory.delete(id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runSearch(query);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 flex gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search memories..."
            data-testid="memory-search-input"
            className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={() => runSearch(query)}
          disabled={loading}
          className="px-4 py-2 text-sm rounded-lg bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 transition-colors"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : 'Search'}
        </button>
        <button
          onClick={openAddModal}
          data-testid="add-memory-button"
          className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
        >
          <Plus size={16} />
          Add Memory
        </button>
      </div>

      {error && (
        <div className="mx-6 mb-3 px-3 py-2 text-sm bg-red-900/30 border border-red-800 rounded-lg text-red-300">
          {error}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 pb-4">
        {loading && memories.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-zinc-500">
            <Loader2 size={20} className="animate-spin mr-2" />
            <span className="text-sm">Loading memories...</span>
          </div>
        ) : memories.length === 0 ? (
          <div
            data-testid="memory-empty-state"
            className="flex flex-col items-center justify-center h-48 text-zinc-500"
          >
            <p className="text-sm">No memories yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {memories.map((m) => {
              const tags = Object.entries(m.metadata || {}).slice(0, 6);
              return (
                <div
                  key={m.id}
                  data-testid={`memory-item-${m.id}`}
                  className="group p-3 bg-zinc-850 border border-zinc-800 rounded-lg hover:border-zinc-700 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-100 line-clamp-3 whitespace-pre-wrap break-words">
                        {m.content}
                      </p>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {tags.map(([k, v]) => (
                            <span
                              key={k}
                              className="px-2 py-0.5 text-[10px] rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700"
                            >
                              {k}: {String(v).slice(0, 24)}
                            </span>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-zinc-500 mt-2">
                        {formatDate(m.createdAt)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditModal(m)}
                        data-testid={`memory-edit-${m.id}`}
                        className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                        title="Edit"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        data-testid={`memory-delete-${m.id}`}
                        className="p-1.5 rounded-md bg-zinc-800 hover:bg-red-900/40 text-zinc-300 hover:text-red-300"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <div
          data-testid="memory-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
          onClick={closeModal}
        >
          <div
            className="w-[520px] max-w-[90vw] bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
              <h3 className="text-sm font-medium text-zinc-100">
                {editing ? 'Edit Memory' : 'Add Memory'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 rounded-md hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-5 py-4 space-y-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">Content</label>
                <textarea
                  value={contentDraft}
                  onChange={(e) => setContentDraft(e.target.value)}
                  rows={5}
                  placeholder="Write what you want to remember..."
                  data-testid="memory-content-input"
                  className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-400 mb-1">
                  Metadata (JSON or key=value per line)
                </label>
                <textarea
                  value={metadataDraft}
                  onChange={(e) => setMetadataDraft(e.target.value)}
                  rows={3}
                  placeholder={'{"topic": "work"}\nor\ntopic=work'}
                  data-testid="memory-metadata-input"
                  className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 font-mono resize-none"
                />
              </div>
            </div>
            <div className="px-5 py-3 border-t border-zinc-800 flex justify-end gap-2">
              <button
                onClick={closeModal}
                disabled={saving}
                className="px-4 py-1.5 text-sm rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !contentDraft.trim()}
                data-testid="memory-save-button"
                className="px-4 py-1.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
