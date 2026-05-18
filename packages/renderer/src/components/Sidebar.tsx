import { Plus, Settings, Trash2, MessageSquare, Search, FileText, Brain } from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import type { Conversation } from '../types';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onSettingsClick: () => void;
  onResearchClick?: () => void;
  onDocumentsClick: () => void;
  onMemoryClick?: () => void;
}

export function Sidebar({
  conversations,
  activeId,
  onSelect,
  onCreate,
  onDelete,
  onSettingsClick,
  onResearchClick,
  onDocumentsClick,
  onMemoryClick,
}: SidebarProps) {
  return (
    <div data-testid="sidebar" className="w-[280px] flex flex-col bg-zinc-950 border-r border-zinc-800 h-screen">
      <div className="p-4 draggable">
        <div className="flex items-center gap-2 mb-4 pt-4">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-sm font-bold">
            Q
          </div>
          <span className="font-semibold text-zinc-100">Quick Cowork</span>
        </div>

        <button
          onClick={onCreate}
          data-testid="new-chat-button"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm text-zinc-200"
        >
          <Plus size={16} />
          New Chat
        </button>
      </div>

      <div data-testid="conversation-list" className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            data-testid={`conversation-item-${conv.id}`}
            onClick={() => onSelect(conv.id)}
            className={cn(
              'group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
              activeId === conv.id
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200',
            )}
          >
            <MessageSquare size={16} className="shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm truncate">{conv.title}</p>
              <p className="text-xs text-zinc-500">{formatDate(conv.updatedAt)}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(conv.id);
              }}
              data-testid={`delete-conversation-${conv.id}`}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-700 text-zinc-500 hover:text-zinc-300 transition-all"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}

        {conversations.length === 0 && (
          <div data-testid="no-conversations" className="text-center text-zinc-600 text-sm py-8">
            No conversations yet
          </div>
        )}
      </div>

      <div className="p-3 border-t border-zinc-800 space-y-1">
        <button
          onClick={onResearchClick}
          data-testid="research-button"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-900 transition-colors text-zinc-400 hover:text-zinc-200 text-sm"
        >
          <Search size={16} />
          Research
        </button>
        <button
          onClick={onDocumentsClick}
          data-testid="documents-button"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-900 transition-colors text-zinc-400 hover:text-zinc-200 text-sm"
        >
          <FileText size={16} />
          Documents
        </button>
        <button
          onClick={onMemoryClick}
          data-testid="memory-button"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-900 transition-colors text-zinc-400 hover:text-zinc-200 text-sm"
        >
          <Brain size={16} />
          Memory
        </button>
        <button
          onClick={onSettingsClick}
          data-testid="settings-button"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-zinc-900 transition-colors text-zinc-400 hover:text-zinc-200 text-sm"
        >
          <Settings size={16} />
          Settings
        </button>
      </div>
    </div>
  );
}
