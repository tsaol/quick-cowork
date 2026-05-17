import { useState, useEffect } from 'react';

declare global {
  interface Window {
    quickCowork: {
      ping: () => Promise<string>;
      chat: {
        send: (message: string) => Promise<void>;
        onStream: (callback: (chunk: { type: string; content: string }) => void) => () => void;
        abort: () => Promise<void>;
      };
      settings: {
        get: () => Promise<Record<string, unknown>>;
        set: (settings: Record<string, unknown>) => Promise<void>;
      };
      file: {
        pick: () => Promise<string[]>;
        read: (path: string) => Promise<string>;
      };
    };
  }
}

export default function App() {
  const [status, setStatus] = useState<string>('connecting...');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);

  useEffect(() => {
    window.quickCowork.ping().then((res) => setStatus(res));

    const unsub = window.quickCowork.chat.onStream((chunk) => {
      if (chunk.type === 'text') {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return [...prev.slice(0, -1), { ...last, content: last.content + chunk.content }];
          }
          return [...prev, { role: 'assistant', content: chunk.content }];
        });
      }
    });

    return unsub;
  }, []);

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', content: input }]);
    window.quickCowork.chat.send(input);
    setInput('');
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-900 text-zinc-100">
      <header className="flex items-center justify-between px-6 py-3 border-b border-zinc-800 draggable">
        <h1 className="text-lg font-semibold">Quick Cowork</h1>
        <span className="text-xs text-zinc-500">IPC: {status}</span>
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="flex items-center justify-center h-full text-zinc-500">
            <p>Start a conversation...</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`max-w-[80%] px-4 py-2 rounded-lg ${
              msg.role === 'user'
                ? 'ml-auto bg-blue-600 text-white'
                : 'mr-auto bg-zinc-800 text-zinc-100'
            }`}
          >
            {msg.content}
          </div>
        ))}
      </main>

      <footer className="px-6 py-4 border-t border-zinc-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask anything..."
            className="flex-1 px-4 py-2 bg-zinc-800 rounded-lg border border-zinc-700 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSend}
            className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Send
          </button>
        </div>
      </footer>
    </div>
  );
}
