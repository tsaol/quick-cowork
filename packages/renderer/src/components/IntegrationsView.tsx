import { useState } from 'react';
import { MessageSquare, Mail, Calendar, Server } from 'lucide-react';
import { SlackTab } from './integrations/SlackTab';
import { GmailTab } from './integrations/GmailTab';
import { CalendarTab } from './integrations/CalendarTab';
import { McpServersTab } from './integrations/McpServersTab';

type Tab = 'slack' | 'gmail' | 'calendar' | 'mcp';

export function IntegrationsView() {
  const [tab, setTab] = useState<Tab>('slack');

  return (
    <div
      data-testid="integrations-view"
      className="flex flex-col h-full bg-zinc-900 text-zinc-100"
    >
      <div className="flex items-center border-b border-zinc-800 px-6 pt-8 pb-0">
        <button
          onClick={() => setTab('slack')}
          data-testid="integrations-tab-slack"
          className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${
            tab === 'slack'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <MessageSquare size={16} />
          Slack
        </button>
        <button
          onClick={() => setTab('gmail')}
          data-testid="integrations-tab-gmail"
          className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${
            tab === 'gmail'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Mail size={16} />
          Gmail
        </button>
        <button
          onClick={() => setTab('calendar')}
          data-testid="integrations-tab-calendar"
          className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${
            tab === 'calendar'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Calendar size={16} />
          Calendar
        </button>
        <button
          onClick={() => setTab('mcp')}
          data-testid="integrations-tab-mcp"
          className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${
            tab === 'mcp'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Server size={16} />
          MCP Servers
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'slack' && <SlackTab />}
        {tab === 'gmail' && <GmailTab />}
        {tab === 'calendar' && <CalendarTab />}
        {tab === 'mcp' && <McpServersTab />}
      </div>
    </div>
  );
}
