import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, Plus, Save, Trash2, Play, X } from 'lucide-react';
import type { AgentDefinition, AgentExecutionResult, AgentInput } from '../types';
import { PROVIDER_MODELS } from '../types';

type Tab = 'list' | 'builder';

const AVAILABLE_TOOLS: { id: string; label: string; description: string }[] = [
  { id: 'web_search', label: 'Web Search', description: 'Search the web for fresh info' },
  { id: 'file_read', label: 'File Read', description: 'Read files in allowed folders' },
  { id: 'memory_search', label: 'Memory Search', description: 'Search the user knowledge base' },
  { id: 'generate_document', label: 'Generate Document', description: 'Create Word/Excel/PPT files' },
];

const ALL_MODELS: string[] = Array.from(
  new Set(Object.values(PROVIDER_MODELS).flat()),
);

function emptyDraft(): AgentInput {
  return {
    name: '',
    instructions: '',
    tools: [],
    model: '',
    temperature: 0.7,
  };
}

export function AgentsView() {
  const [tab, setTab] = useState<Tab>('list');
  const [agents, setAgents] = useState<AgentDefinition[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<AgentInput>(emptyDraft());
  const [testOpen, setTestOpen] = useState<AgentDefinition | null>(null);

  const loadAgents = useCallback(async () => {
    const list = await window.quickCowork.agents.list();
    setAgents(list);
  }, []);

  useEffect(() => {
    loadAgents();
  }, [loadAgents]);

  const startNew = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setTab('builder');
  };

  const startEdit = (agent: AgentDefinition) => {
    setEditingId(agent.id);
    setDraft({
      name: agent.name,
      instructions: agent.instructions,
      tools: agent.tools,
      model: agent.model ?? '',
      temperature: agent.temperature ?? 0.7,
    });
    setTab('builder');
  };

  const handleSave = async () => {
    const name = draft.name.trim();
    const instructions = draft.instructions.trim();
    if (!name || !instructions) return;

    const payload: AgentInput = {
      name,
      instructions,
      tools: draft.tools,
      model: draft.model || undefined,
      temperature: draft.temperature,
    };

    if (editingId) {
      await window.quickCowork.agents.update(editingId, payload);
    } else {
      const created = await window.quickCowork.agents.create(payload);
      setEditingId(created.id);
    }
    await loadAgents();
  };

  const handleDelete = async (id: string) => {
    await window.quickCowork.agents.delete(id);
    if (editingId === id) {
      setEditingId(null);
      setDraft(emptyDraft());
    }
    await loadAgents();
  };

  const toggleTool = (toolId: string) => {
    setDraft((d) => {
      const has = d.tools.includes(toolId);
      return {
        ...d,
        tools: has ? d.tools.filter((t) => t !== toolId) : [...d.tools, toolId],
      };
    });
  };

  return (
    <div
      data-testid="agents-view"
      className="flex flex-col h-full bg-zinc-900 text-zinc-100"
    >
      <div className="flex items-center border-b border-zinc-800 px-6 pt-8 pb-0">
        <button
          onClick={() => setTab('list')}
          data-testid="agents-tab-list"
          className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${
            tab === 'list'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Bot size={16} />
          My Agents
        </button>
        <button
          onClick={() => setTab('builder')}
          data-testid="agents-tab-builder"
          className={`flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors ${
            tab === 'builder'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200'
          }`}
        >
          <Plus size={16} />
          Builder
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'list' ? (
          <AgentList
            agents={agents}
            onCreate={startNew}
            onEdit={startEdit}
            onDelete={handleDelete}
            onTest={(a) => setTestOpen(a)}
          />
        ) : (
          <AgentBuilder
            draft={draft}
            isEditing={!!editingId}
            onChange={setDraft}
            onSave={handleSave}
            onDelete={editingId ? () => handleDelete(editingId) : undefined}
            onToggleTool={toggleTool}
          />
        )}
      </div>

      {testOpen && (
        <AgentTestModal agent={testOpen} onClose={() => setTestOpen(null)} />
      )}
    </div>
  );
}

interface AgentListProps {
  agents: AgentDefinition[];
  onCreate: () => void;
  onEdit: (a: AgentDefinition) => void;
  onDelete: (id: string) => void;
  onTest: (a: AgentDefinition) => void;
}

function AgentList({ agents, onCreate, onEdit, onDelete, onTest }: AgentListProps) {
  return (
    <div data-testid="agent-list" className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold">My Agents</h2>
        <button
          onClick={onCreate}
          data-testid="agent-new-button"
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm"
        >
          <Plus size={16} />
          New Agent
        </button>
      </div>

      {agents.length === 0 ? (
        <div
          data-testid="agent-list-empty"
          className="rounded-lg border border-dashed border-zinc-700 p-10 text-center text-zinc-500"
        >
          No agents yet. Click "New Agent" to build one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((a) => (
            <div
              key={a.id}
              data-testid={`agent-card-${a.id}`}
              className="rounded-lg border border-zinc-800 bg-zinc-950 p-4 flex flex-col gap-3"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-md bg-blue-600/20 text-blue-400 flex items-center justify-center">
                  <Bot size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-zinc-100 truncate">{a.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {a.tools.length} tool{a.tools.length === 1 ? '' : 's'} ·{' '}
                    Updated {new Date(a.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <p className="text-sm text-zinc-400 line-clamp-2">
                {a.instructions || <span className="italic">No instructions</span>}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() => onTest(a)}
                  data-testid={`agent-test-${a.id}`}
                  className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700"
                >
                  <Play size={12} />
                  Test
                </button>
                <button
                  onClick={() => onEdit(a)}
                  data-testid={`agent-edit-${a.id}`}
                  className="flex-1 px-2 py-1.5 text-xs rounded bg-zinc-800 hover:bg-zinc-700"
                >
                  Edit
                </button>
                <button
                  onClick={() => onDelete(a.id)}
                  data-testid={`agent-delete-${a.id}`}
                  className="px-2 py-1.5 text-xs rounded bg-zinc-800 hover:bg-red-700 text-zinc-400 hover:text-zinc-100"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface AgentBuilderProps {
  draft: AgentInput;
  isEditing: boolean;
  onChange: (d: AgentInput) => void;
  onSave: () => void;
  onDelete?: () => void;
  onToggleTool: (toolId: string) => void;
}

function AgentBuilder({
  draft,
  isEditing,
  onChange,
  onSave,
  onDelete,
  onToggleTool,
}: AgentBuilderProps) {
  const canSave = draft.name.trim().length > 0 && draft.instructions.trim().length > 0;

  return (
    <div data-testid="agent-builder" className="max-w-3xl mx-auto space-y-6">
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Name</label>
        <input
          type="text"
          value={draft.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
          data-testid="agent-name-input"
          placeholder="e.g. Research Assistant"
          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">
          Instructions / System Prompt
        </label>
        <textarea
          value={draft.instructions}
          onChange={(e) => onChange({ ...draft, instructions: e.target.value })}
          data-testid="agent-instructions-input"
          rows={10}
          placeholder="Describe what this agent does, its tone, the steps it should follow..."
          className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm font-mono focus:outline-none focus:border-blue-500 resize-y"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-2">Tools</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {AVAILABLE_TOOLS.map((tool) => {
            const checked = draft.tools.includes(tool.id);
            return (
              <label
                key={tool.id}
                data-testid={`agent-tool-${tool.id}`}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  checked
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onToggleTool(tool.id)}
                  className="mt-0.5"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-zinc-100">{tool.label}</p>
                  <p className="text-xs text-zinc-500">{tool.description}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Model (optional)
          </label>
          <select
            value={draft.model ?? ''}
            onChange={(e) => onChange({ ...draft, model: e.target.value })}
            data-testid="agent-model-select"
            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm"
          >
            <option value="">Use app default</option>
            {ALL_MODELS.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">
            Temperature: {draft.temperature?.toFixed(2) ?? '0.70'}
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={draft.temperature ?? 0.7}
            onChange={(e) =>
              onChange({ ...draft, temperature: parseFloat(e.target.value) })
            }
            data-testid="agent-temperature-input"
            className="w-full"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={onSave}
          disabled={!canSave}
          data-testid="agent-save-button"
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500 text-sm"
        >
          <Save size={16} />
          {isEditing ? 'Save Changes' : 'Create Agent'}
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            data-testid="agent-delete-button"
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-red-700 text-sm"
          >
            <Trash2 size={16} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

interface AgentTestModalProps {
  agent: AgentDefinition;
  onClose: () => void;
}

function AgentTestModal({ agent, onClose }: AgentTestModalProps) {
  const [input, setInput] = useState('');
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<AgentExecutionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!input.trim()) return;
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await window.quickCowork.agents.execute(agent.id, input.trim());
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Execution failed');
    } finally {
      setRunning(false);
    }
  };

  const toolBadges = useMemo(() => {
    if (!result) return null;
    return result.toolCalls.map((tc, idx) => (
      <span
        key={idx}
        className="px-2 py-0.5 text-xs rounded bg-zinc-800 text-zinc-400"
      >
        {tc.tool}
      </span>
    ));
  }, [result]);

  return (
    <div
      data-testid="agent-test-modal"
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-3">
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-blue-400" />
            <h3 className="font-medium">Test "{agent.name}"</h3>
          </div>
          <button
            onClick={onClose}
            data-testid="agent-test-close"
            className="text-zinc-400 hover:text-zinc-200"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Your message
            </label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              data-testid="agent-test-input"
              rows={3}
              placeholder="Type a message to test the agent..."
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {error && (
            <div
              data-testid="agent-test-error"
              className="rounded-lg border border-red-700 bg-red-900/30 p-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          {result && (
            <div data-testid="agent-test-result" className="space-y-3">
              <div className="text-xs text-zinc-500 flex items-center gap-2">
                <span>Done in {result.duration}ms</span>
                {result.toolCalls.length > 0 && (
                  <>
                    <span>·</span>
                    <span>Tools:</span>
                    <div className="flex gap-1">{toolBadges}</div>
                  </>
                )}
              </div>
              <div className="rounded-lg bg-zinc-950 border border-zinc-800 p-3 text-sm whitespace-pre-wrap">
                {result.output || <span className="text-zinc-500 italic">No output</span>}
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800 px-5 py-3 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-1.5 text-sm rounded-lg bg-zinc-800 hover:bg-zinc-700"
          >
            Close
          </button>
          <button
            onClick={run}
            disabled={running || !input.trim()}
            data-testid="agent-test-run"
            className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-500"
          >
            <Play size={14} />
            {running ? 'Running...' : 'Run'}
          </button>
        </div>
      </div>
    </div>
  );
}
