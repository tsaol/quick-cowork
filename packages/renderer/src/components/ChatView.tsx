import { useState, useRef, useEffect } from 'react';
import { Send, Square, Sparkles } from 'lucide-react';
import { MessageBubble } from './MessageBubble';
import type { ChatMessage, StreamChunk } from '../types';

interface ChatViewProps {
  conversationId: string;
}

export function ChatView({ conversationId }: ChatViewProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    window.quickCowork.conversations.messages(conversationId).then(setMessages);
  }, [conversationId]);

  useEffect(() => {
    const unsub = window.quickCowork.chat.onStream((chunk: StreamChunk) => {
      if (chunk.type === 'text') {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && last.id === '__streaming__') {
            return [
              ...prev.slice(0, -1),
              { ...last, content: last.content + chunk.content },
            ];
          }
          return [
            ...prev,
            {
              id: '__streaming__',
              role: 'assistant',
              content: chunk.content,
              timestamp: Date.now(),
            },
          ];
        });
      } else if (chunk.type === 'done') {
        setIsStreaming(false);
        window.quickCowork.conversations.messages(conversationId).then(setMessages);
      } else if (chunk.type === 'error') {
        setIsStreaming(false);
        setMessages((prev) => [
          ...prev.filter((m) => m.id !== '__streaming__'),
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Error: ${chunk.content}`,
            timestamp: Date.now(),
          },
        ]);
      }
    });

    return unsub;
  }, [conversationId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsStreaming(true);

    inputRef.current?.focus();
    window.quickCowork.chat.send(conversationId, text);
  };

  const handleAbort = () => {
    window.quickCowork.chat.abort();
    setIsStreaming(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 lg:px-16 xl:px-24">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800 flex items-center justify-center">
              <Sparkles size={28} className="text-blue-500" />
            </div>
            <div className="text-center">
              <h2 className="text-lg font-medium text-zinc-300 mb-1">How can I help you?</h2>
              <p className="text-sm">Ask me anything to get started</p>
            </div>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto py-4">
            {messages.map((msg, i) => (
              <MessageBubble
                key={msg.id + i}
                message={msg}
                isStreaming={isStreaming && msg.id === '__streaming__'}
              />
            ))}
          </div>
        )}
      </div>

      <div className="px-6 lg:px-16 xl:px-24 pb-4 pt-2">
        <div className="max-w-3xl mx-auto">
          <div className="relative flex items-end bg-zinc-800 rounded-xl border border-zinc-700 focus-within:border-blue-500 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Message Quick Cowork..."
              rows={1}
              className="flex-1 resize-none bg-transparent px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none max-h-40 min-h-[44px]"
              style={{ height: 'auto', overflow: 'hidden' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = Math.min(target.scrollHeight, 160) + 'px';
                target.style.overflow = target.scrollHeight > 160 ? 'auto' : 'hidden';
              }}
            />
            <div className="p-2">
              {isStreaming ? (
                <button
                  onClick={handleAbort}
                  className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  <Square size={16} />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:text-zinc-500 text-white transition-colors"
                >
                  <Send size={16} />
                </button>
              )}
            </div>
          </div>
          <p className="text-xs text-zinc-600 text-center mt-2">
            Ctrl+Shift+Space to toggle window
          </p>
        </div>
      </div>
    </div>
  );
}
