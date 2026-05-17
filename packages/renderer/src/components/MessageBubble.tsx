import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, User, Bot } from 'lucide-react';
import { useState } from 'react';
import { cn } from '../lib/utils';
import type { ChatMessage } from '../types';

interface MessageBubbleProps {
  message: ChatMessage;
  isStreaming?: boolean;
}

function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const match = /language-(\w+)/.exec(className || '');
  const lang = match ? match[1] : '';
  const code = String(children).replace(/\n$/, '');

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!className) {
    return (
      <code className="px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-200 text-sm font-mono">
        {children}
      </code>
    );
  }

  return (
    <div className="relative group rounded-lg overflow-hidden my-3">
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-800 border-b border-zinc-700">
        <span className="text-xs text-zinc-400 font-mono">{lang || 'code'}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-4 bg-zinc-900 overflow-x-auto">
        <code className={cn('text-sm font-mono', className)}>{code}</code>
      </pre>
    </div>
  );
}

export function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={cn('flex gap-3 py-4', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
          isUser ? 'bg-blue-600' : 'bg-zinc-700',
        )}
      >
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>

      <div className={cn('max-w-[75%] min-w-0', isUser ? 'text-right' : 'text-left')}>
        <div
          className={cn(
            'inline-block rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
            isUser
              ? 'bg-blue-600 text-white rounded-br-md'
              : 'bg-zinc-800 text-zinc-100 rounded-bl-md',
          )}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  code: ({ className, children }) => (
                    <CodeBlock className={className}>{children}</CodeBlock>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
              {isStreaming && (
                <span className="inline-block w-2 h-4 bg-zinc-400 animate-pulse ml-0.5" />
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
