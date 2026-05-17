import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatView } from './components/ChatView';
import type { Conversation } from './types';

export default function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

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
  };

  const handleDelete = async (id: string) => {
    await window.quickCowork.conversations.delete(id);
    const list = await loadConversations();
    if (activeId === id) {
      setActiveId(list.length > 0 ? list[0].id : null);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-900 text-zinc-100">
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onCreate={handleCreate}
        onDelete={handleDelete}
        onSettingsClick={() => {}}
      />
      <main className="flex-1 flex flex-col min-w-0">
        {activeId ? (
          <ChatView conversationId={activeId} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            <p>Select or create a conversation to start</p>
          </div>
        )}
      </main>
    </div>
  );
}
