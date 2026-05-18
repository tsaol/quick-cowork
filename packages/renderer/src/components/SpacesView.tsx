import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Users, Send, UserPlus, Sparkles, ArrowLeft, Circle } from 'lucide-react';
import { cn } from '../lib/utils';
import type { Space, SpaceMember, SpaceMessage, SyncState } from '../types';

type Tab = 'list' | 'messages';

export function SpacesView() {
  const [tab, setTab] = useState<Tab>('list');
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [activeSpace, setActiveSpace] = useState<Space | null>(null);
  const [members, setMembers] = useState<SpaceMember[]>([]);
  const [messages, setMessages] = useState<SpaceMessage[]>([]);
  const [syncState, setSyncState] = useState<SyncState | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createDesc, setCreateDesc] = useState('');
  const [joinId, setJoinId] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [draft, setDraft] = useState('');
  const messagesEnd = useRef<HTMLDivElement | null>(null);

  const loadSpaces = useCallback(async () => {
    const list = await window.quickCowork.spaces.list();
    setSpaces(list);
  }, []);

  const refreshActive = useCallback(async (spaceId: string) => {
    const [space, msgs, sync] = await Promise.all([
      window.quickCowork.spaces.get(spaceId),
      window.quickCowork.spaces.messages(spaceId),
      window.quickCowork.spaces.sync(spaceId),
    ]);
    if (space) {
      setActiveSpace(space);
      setMembers(space.members);
    }
    setMessages(msgs);
    setSyncState(sync);
  }, []);

  useEffect(() => {
    loadSpaces();
  }, [loadSpaces]);

  useEffect(() => {
    if (!activeSpace) return;
    const id = activeSpace.id;
    const interval = setInterval(() => refreshActive(id), 5000);
    return () => clearInterval(interval);
  }, [activeSpace, refreshActive]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelect = async (space: Space) => {
    setActiveSpace(space);
    setTab('messages');
    await refreshActive(space.id);
  };

  const handleCreate = async () => {
    if (!createName.trim()) return;
    const space = await window.quickCowork.spaces.create(createName.trim(), createDesc.trim());
    setCreateName('');
    setCreateDesc('');
    setShowCreate(false);
    await loadSpaces();
    handleSelect(space);
  };

  const handleJoin = async () => {
    if (!joinId.trim()) return;
    const space = await window.quickCowork.spaces.join(joinId.trim(), 'editor');
    setJoinId('');
    setShowJoin(false);
    if (space) {
      await loadSpaces();
      handleSelect(space);
    }
  };

  const handleInvite = async () => {
    if (!activeSpace || !inviteEmail.trim()) return;
    await window.quickCowork.spaces.invite(activeSpace.id, inviteEmail.trim(), inviteRole);
    setInviteEmail('');
    setShowInvite(false);
    await refreshActive(activeSpace.id);
  };

  const handleSend = async (type: SpaceMessage['type'] = 'text') => {
    if (!activeSpace || !draft.trim()) return;
    await window.quickCowork.spaces.send(activeSpace.id, draft.trim(), type);
    setDraft('');
    await refreshActive(activeSpace.id);
  };

  const handleAskAi = async () => {
    if (!activeSpace || !draft.trim()) return;
    const question = draft.trim();
    await window.quickCowork.spaces.send(activeSpace.id, question, 'text');
    setDraft('');
    try {
      const conv = await window.quickCowork.conversations.create(`Space: ${activeSpace.name}`);
      await window.quickCowork.chat.send(conv.id, question);
      // Wait briefly for the assistant reply to land in the conversation store.
      await new Promise((r) => setTimeout(r, 1500));
      const history = await window.quickCowork.conversations.messages(conv.id);
      const last = history.filter((m) => m.role === 'assistant').slice(-1)[0];
      if (last) {
        await window.quickCowork.spaces.send(activeSpace.id, last.content, 'ai_response');
      }
    } catch {
      await window.quickCowork.spaces.send(
        activeSpace.id,
        'AI request failed. Configure a provider in Settings.',
        'system',
      );
    }
    await refreshActive(activeSpace.id);
  };

  const onlineCount = (sp: Space) => sp.members.filter((m) => m.online).length;

  const syncBadge = () => {
    if (!syncState) return null;
    const ok = syncState.connected && syncState.pendingChanges === 0;
    return (
      <div
        data-testid="space-sync-status"
        className="flex items-center gap-1.5 text-xs text-zinc-400"
      >
        <span
          className={cn(
            'inline-block w-2 h-2 rounded-full',
            ok ? 'bg-green-500' : 'bg-yellow-500',
          )}
        />
        {ok ? 'Synced' : `${syncState.pendingChanges} pending`}
      </div>
    );
  };

  return (
    <div data-testid="spaces-view" className="flex flex-col h-full bg-zinc-900 text-zinc-100">
      <div className="flex items-center border-b border-zinc-800 px-6 pt-8 pb-0">
        <button
          onClick={() => {
            setTab('list');
            setActiveSpace(null);
          }}
          data-testid="spaces-tab-list"
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors',
            tab === 'list'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200',
          )}
        >
          <Users size={16} />
          My Spaces
        </button>
        <button
          onClick={() => activeSpace && setTab('messages')}
          data-testid="spaces-tab-messages"
          disabled={!activeSpace}
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors',
            tab === 'messages'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200 disabled:opacity-40 disabled:hover:text-zinc-400',
          )}
        >
          Messages
          {activeSpace && <span className="text-xs text-zinc-500">— {activeSpace.name}</span>}
        </button>
      </div>

      {tab === 'list' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <div className="flex gap-2">
            <button
              onClick={() => setShowCreate((v) => !v)}
              data-testid="space-create-toggle"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm"
            >
              <Plus size={16} />
              Create Space
            </button>
            <button
              onClick={() => setShowJoin((v) => !v)}
              data-testid="space-join-toggle"
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-sm"
            >
              <UserPlus size={16} />
              Join Space
            </button>
          </div>

          {showCreate && (
            <div
              data-testid="space-create-form"
              className="space-y-2 p-4 rounded-lg bg-zinc-950 border border-zinc-800"
            >
              <input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Space name"
                data-testid="space-create-name"
                className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-800 text-sm"
              />
              <textarea
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                placeholder="Description (optional)"
                rows={2}
                data-testid="space-create-description"
                className="w-full px-3 py-2 rounded bg-zinc-900 border border-zinc-800 text-sm resize-none"
              />
              <button
                onClick={handleCreate}
                data-testid="space-create-submit"
                className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-sm"
              >
                Create
              </button>
            </div>
          )}

          {showJoin && (
            <div
              data-testid="space-join-form"
              className="flex gap-2 p-4 rounded-lg bg-zinc-950 border border-zinc-800"
            >
              <input
                value={joinId}
                onChange={(e) => setJoinId(e.target.value)}
                placeholder="Invite code (space ID)"
                data-testid="space-join-input"
                className="flex-1 px-3 py-2 rounded bg-zinc-900 border border-zinc-800 text-sm"
              />
              <button
                onClick={handleJoin}
                data-testid="space-join-submit"
                className="px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-sm"
              >
                Join
              </button>
            </div>
          )}

          <div data-testid="spaces-list" className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {spaces.map((sp) => (
              <button
                key={sp.id}
                onClick={() => handleSelect(sp)}
                data-testid={`space-card-${sp.id}`}
                className="text-left p-4 rounded-lg bg-zinc-950 border border-zinc-800 hover:border-zinc-700 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{sp.name}</p>
                    {sp.description && (
                      <p className="text-xs text-zinc-500 mt-1 line-clamp-2">{sp.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {sp.members.slice(0, 4).map((m) => (
                      <span
                        key={m.id}
                        title={`${m.name} (${m.role})`}
                        className={cn(
                          'inline-block w-2 h-2 rounded-full',
                          m.online ? 'bg-green-500' : 'bg-zinc-600',
                        )}
                      />
                    ))}
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 text-xs text-zinc-500">
                  <span>{sp.members.length} members</span>
                  <span>{onlineCount(sp)} online</span>
                </div>
              </button>
            ))}

            {spaces.length === 0 && (
              <div data-testid="spaces-empty" className="text-zinc-500 text-sm py-8">
                No spaces yet. Create one to get started.
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'messages' && activeSpace && (
        <div className="flex-1 flex min-h-0">
          <aside className="w-56 border-r border-zinc-800 p-4 space-y-3 overflow-y-auto">
            <button
              onClick={() => {
                setTab('list');
                setActiveSpace(null);
              }}
              data-testid="space-back-button"
              className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200"
            >
              <ArrowLeft size={14} /> All spaces
            </button>
            <div>
              <p className="font-medium text-sm">{activeSpace.name}</p>
              {activeSpace.description && (
                <p className="text-xs text-zinc-500 mt-0.5">{activeSpace.description}</p>
              )}
            </div>
            <button
              onClick={() => setShowInvite((v) => !v)}
              data-testid="space-invite-toggle"
              className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-xs"
            >
              <UserPlus size={14} /> Invite
            </button>
            {showInvite && (
              <div data-testid="space-invite-form" className="space-y-2">
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com"
                  data-testid="space-invite-email"
                  className="w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs"
                />
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}
                  data-testid="space-invite-role"
                  className="w-full px-2 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-xs"
                >
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button
                  onClick={handleInvite}
                  data-testid="space-invite-submit"
                  className="w-full px-2 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-xs"
                >
                  Send invite
                </button>
              </div>
            )}
            <div data-testid="space-members" className="space-y-1.5 pt-2 border-t border-zinc-800">
              <p className="text-xs uppercase text-zinc-500 tracking-wide">Members</p>
              {members.map((m) => (
                <div
                  key={m.id}
                  data-testid={`space-member-${m.id}`}
                  className="flex items-center gap-2 text-xs"
                >
                  <Circle
                    size={8}
                    className={cn(
                      'shrink-0',
                      m.online ? 'fill-green-500 text-green-500' : 'fill-zinc-600 text-zinc-600',
                    )}
                  />
                  <span className="truncate flex-1">{m.name}</span>
                  <span className="text-zinc-500">{m.role}</span>
                </div>
              ))}
            </div>
          </aside>

          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800">
              <p className="text-xs text-zinc-500">Space ID: {activeSpace.id}</p>
              {syncBadge()}
            </div>

            <div
              data-testid="space-messages"
              className="flex-1 overflow-y-auto p-4 space-y-3"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  data-testid={`space-message-${msg.id}`}
                  className={cn(
                    'rounded-lg p-3 text-sm max-w-[80%]',
                    msg.type === 'ai_response'
                      ? 'bg-blue-950 border border-blue-900'
                      : msg.type === 'system'
                        ? 'bg-zinc-950 text-zinc-500 italic'
                        : 'bg-zinc-800',
                  )}
                >
                  <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
                    {msg.type === 'ai_response' && <Sparkles size={12} />}
                    <span>{msg.senderName}</span>
                    <span className="text-zinc-600">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>
                </div>
              ))}
              {messages.length === 0 && (
                <div className="text-center text-zinc-500 text-sm py-8">
                  No messages yet. Say hi.
                </div>
              )}
              <div ref={messagesEnd} />
            </div>

            <div className="border-t border-zinc-800 p-3 flex gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Message…"
                rows={1}
                data-testid="space-message-input"
                className="flex-1 px-3 py-2 rounded bg-zinc-950 border border-zinc-800 text-sm resize-none"
              />
              <button
                onClick={handleAskAi}
                data-testid="space-ai-button"
                title="Ask AI in this space"
                className="px-3 py-2 rounded bg-zinc-800 hover:bg-zinc-700 text-sm flex items-center gap-1.5"
              >
                <Sparkles size={14} /> AI
              </button>
              <button
                onClick={() => handleSend()}
                data-testid="space-send-button"
                className="px-3 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm flex items-center gap-1.5"
              >
                <Send size={14} /> Send
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
