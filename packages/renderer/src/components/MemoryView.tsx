import { useState } from 'react';
import { Brain, Network } from 'lucide-react';
import { MemoryList } from './memory/MemoryList';
import { KnowledgeGraphView } from './memory/KnowledgeGraphView';

type Tab = 'memories' | 'graph';

export function MemoryView() {
  const [tab, setTab] = useState<Tab>('memories');

  return (
    <div
      data-testid="memory-view"
      className="flex flex-col h-full bg-zinc-900 text-zinc-100"
    >
      <div className="flex items-center border-b border-zinc-800 px-6 pt-8 pb-0">
        <button
          onClick={() => setTab('memories')}
          data-testid="memory-tab-memories"
          className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${
            tab === 'memories'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Brain size={16} />
          Memories
        </button>
        <button
          onClick={() => setTab('graph')}
          data-testid="memory-tab-graph"
          className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${
            tab === 'graph'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Network size={16} />
          Knowledge Graph
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'memories' ? <MemoryList /> : <KnowledgeGraphView />}
      </div>
    </div>
  );
}
