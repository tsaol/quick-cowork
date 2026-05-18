import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import { SettingsView } from './components/SettingsView';
import { DocumentGenerator } from './components/DocumentGenerator';
import { ResearchView } from './components/ResearchView';
import { MemoryView } from './components/MemoryView';
import type { Conversation } from './types';

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [view, setView] = useState<
    'chat' | 'settings' | 'research' | 'documents' | 'memory'
  >('chat');

  const loadConversations = useCallback(async () => {
    const list = await window.quickCowork.conversations.list();
    setConversations(list);
    return list;
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const handleCreate = async () => {
    const conv = await window.quickCowork.conversations.create();
    await loadConversations();
    setActiveId(conv.id);
    setView('chat');
  };

  const handleDelete = async (id: string) => {
    await window.quickCowork.conversations.delete(id);
    const list = await loadConversations();
    if (activeId === id) {
      setActiveId(list.length > 0 ? list[0].id : null);
    }
  };

  return (
    <div data-testid="app" className="flex h-screen bg-zinc-900 text-zinc-100">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={(id) => {
          setActiveId(id);
          setView('chat');
        }}
        onCreate={handleCreate}
        onDelete={handleDelete}
        onSettingsClick={() => setView('settings')}
        onResearchClick={() => setView('research')}
        onDocumentsClick={() => setView('documents')}
        onMemoryClick={() => setView('memory')}
      />
      <main data-testid="main-content" className="flex-1 flex flex-col min-w-0">
        {view === 'documents' ? (
          <DocumentGenerator onClose={() => setView('chat')} />
        ) : view === 'settings' ? (
          <SettingsView onBack={() => setView('chat')} />
        ) : view === 'research' ? (
          <ResearchView />
        ) : view === 'memory' ? (
          <MemoryView />
        ) : activeId ? (
          <ChatView conversationId={activeId} />
        ) : (
          <div
            data-testid="empty-state"
            className="flex-1 flex items-center justify-center text-zinc-500"
          >
            <p>Select or create a conversation to start</p>
          </div>
        )}
      </main>
    </div>
  );
}
