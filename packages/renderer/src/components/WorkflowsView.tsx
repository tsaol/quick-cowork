import { useState, useEffect, useCallback } from 'react';
import {
  Zap,
  Plus,
  Play,
  Trash2,
  Save,
  ArrowDown,
  Clock,
  Mail,
  History,
  X,
} from 'lucide-react';
import { cn, formatDate } from '../lib/utils';
import type {
  Workflow,
  WorkflowAction,
  WorkflowActionType,
  WorkflowTrigger,
  WorkflowRun,
  ScheduleTriggerConfig,
  EventTriggerConfig,
} from '../types';

type Tab = 'list' | 'builder' | 'history';

const ACTION_LABELS: Record<WorkflowActionType, string> = {
  send_slack: 'Send Slack Message',
  send_email: 'Send Email',
  generate_doc: 'Generate Document',
  ai_process: 'AI Process',
  save_memory: 'Save to Memory',
};

const SCHEDULE_OPTIONS = [
  { value: 'every_5min', label: 'Every 5 minutes' },
  { value: 'every_15min', label: 'Every 15 minutes' },
  { value: 'every_30min', label: 'Every 30 minutes' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
];

function newAction(type: WorkflowActionType = 'ai_process'): WorkflowAction {
  return {
    id: crypto.randomUUID(),
    type,
    config: defaultActionConfig(type),
  };
}

function defaultActionConfig(type: WorkflowActionType): Record<string, unknown> {
  switch (type) {
    case 'send_slack':
      return { channel: '', text: '{{input}}' };
    case 'send_email':
      return { to: '', subject: '', body: '{{input}}' };
    case 'generate_doc':
      return { docType: 'word', title: 'Workflow Output', content: '{{input}}' };
    case 'ai_process':
      return { prompt: 'Summarize the following: {{input}}' };
    case 'save_memory':
      return { content: '{{input}}' };
    default:
      return {};
  }
}

function emptyDraft(): {
  id?: string;
  name: string;
  description: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  enabled: boolean;
} {
  return {
    name: '',
    description: '',
    trigger: { type: 'schedule', config: { cron: 'daily' } as ScheduleTriggerConfig },
    actions: [newAction('ai_process')],
    enabled: true,
  };
}

export function WorkflowsView() {
  const [tab, setTab] = useState<Tab>('list');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [latestRuns, setLatestRuns] = useState<Record<string, WorkflowRun | null>>({});
  const [draft, setDraft] = useState(emptyDraft());
  const [historyWorkflowId, setHistoryWorkflowId] = useState<string | null>(null);
  const [history, setHistory] = useState<WorkflowRun[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadWorkflows = useCallback(async () => {
    const list = await window.quickCowork.workflows.list();
    setWorkflows(list);
    const runs: Record<string, WorkflowRun | null> = {};
    for (const w of list) {
      const items = await window.quickCowork.workflows.history(w.id, 1);
      runs[w.id] = items[0] ?? null;
    }
    setLatestRuns(runs);
  }, []);

  useEffect(() => {
    loadWorkflows();
  }, [loadWorkflows]);

  const handleNew = () => {
    setDraft(emptyDraft());
    setTab('builder');
  };

  const handleEdit = (workflow: Workflow) => {
    setDraft({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      trigger: workflow.trigger,
      actions: workflow.actions,
      enabled: workflow.enabled,
    });
    setTab('builder');
  };

  const handleSave = async () => {
    if (!draft.name.trim()) {
      setMessage('Name is required');
      return;
    }
    setLoading(true);
    try {
      if (draft.id) {
        await window.quickCowork.workflows.update(draft.id, {
          name: draft.name,
          description: draft.description,
          trigger: draft.trigger,
          actions: draft.actions,
          enabled: draft.enabled,
        });
      } else {
        await window.quickCowork.workflows.create({
          name: draft.name,
          description: draft.description,
          trigger: draft.trigger,
          actions: draft.actions,
          enabled: draft.enabled,
        });
      }
      await loadWorkflows();
      setMessage('Workflow saved');
      setTab('list');
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    await window.quickCowork.workflows.delete(id);
    await loadWorkflows();
  };

  const handleToggle = async (workflow: Workflow) => {
    await window.quickCowork.workflows.toggle(workflow.id, !workflow.enabled);
    await loadWorkflows();
  };

  const handleTest = async (id: string) => {
    setLoading(true);
    try {
      const run = await window.quickCowork.workflows.execute(id);
      setMessage(`Run ${run.status}`);
      await loadWorkflows();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Run failed');
    } finally {
      setLoading(false);
    }
  };

  const handleShowHistory = async (workflow: Workflow) => {
    setHistoryWorkflowId(workflow.id);
    const runs = await window.quickCowork.workflows.history(workflow.id, 50);
    setHistory(runs);
    setTab('history');
  };

  const updateAction = (index: number, action: WorkflowAction) => {
    const next = [...draft.actions];
    next[index] = action;
    setDraft({ ...draft, actions: next });
  };

  const removeAction = (index: number) => {
    const next = draft.actions.filter((_, i) => i !== index);
    setDraft({ ...draft, actions: next });
  };

  const addAction = () => {
    setDraft({ ...draft, actions: [...draft.actions, newAction('ai_process')] });
  };

  return (
    <div
      data-testid="workflows-view"
      className="flex flex-col h-full bg-zinc-900 text-zinc-100"
    >
      <div className="flex items-center border-b border-zinc-800 px-6 pt-8 pb-0">
        <button
          onClick={() => setTab('list')}
          data-testid="workflows-tab-list"
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors',
            tab === 'list'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200',
          )}
        >
          <Zap size={16} />
          My Workflows
        </button>
        <button
          onClick={handleNew}
          data-testid="workflows-tab-builder"
          className={cn(
            'flex items-center gap-2 px-4 py-2 text-sm border-b-2 transition-colors',
            tab === 'builder'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-zinc-400 hover:text-zinc-200',
          )}
        >
          <Plus size={16} />
          Builder
        </button>
        {tab === 'history' && historyWorkflowId && (
          <button
            data-testid="workflows-tab-history"
            className="flex items-center gap-2 px-4 py-2 text-sm border-b-2 border-blue-500 text-blue-400"
          >
            <History size={16} />
            History
          </button>
        )}
      </div>

      {message && (
        <div
          data-testid="workflows-message"
          className="flex items-center justify-between px-6 py-2 bg-zinc-800/60 text-sm text-zinc-200 border-b border-zinc-800"
        >
          <span>{message}</span>
          <button onClick={() => setMessage(null)}>
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-6">
        {tab === 'list' && (
          <WorkflowList
            workflows={workflows}
            latestRuns={latestRuns}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onToggle={handleToggle}
            onTest={handleTest}
            onHistory={handleShowHistory}
            loading={loading}
          />
        )}
        {tab === 'builder' && (
          <WorkflowBuilder
            draft={draft}
            onChange={setDraft}
            onSave={handleSave}
            onDelete={
              draft.id
                ? async () => {
                    await handleDelete(draft.id!);
                    setTab('list');
                  }
                : undefined
            }
            onTest={draft.id ? () => handleTest(draft.id!) : undefined}
            onAddAction={addAction}
            onUpdateAction={updateAction}
            onRemoveAction={removeAction}
            loading={loading}
          />
        )}
        {tab === 'history' && (
          <HistoryView
            runs={history}
            onBack={() => setTab('list')}
          />
        )}
      </div>
    </div>
  );
}

function WorkflowList({
  workflows,
  latestRuns,
  onEdit,
  onDelete,
  onToggle,
  onTest,
  onHistory,
  loading,
}: {
  workflows: Workflow[];
  latestRuns: Record<string, WorkflowRun | null>;
  onEdit: (w: Workflow) => void;
  onDelete: (id: string) => void;
  onToggle: (w: Workflow) => void;
  onTest: (id: string) => void;
  onHistory: (w: Workflow) => void;
  loading: boolean;
}) {
  if (workflows.length === 0) {
    return (
      <div
        data-testid="workflows-empty"
        className="text-center text-zinc-500 mt-16"
      >
        <Zap size={32} className="mx-auto mb-3 text-zinc-600" />
        <p className="text-sm">No workflows yet. Use the Builder tab to create one.</p>
      </div>
    );
  }

  return (
    <div data-testid="workflow-list" className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {workflows.map((w) => {
        const lastRun = latestRuns[w.id];
        return (
          <div
            key={w.id}
            data-testid={`workflow-card-${w.id}`}
            className="bg-zinc-800/60 border border-zinc-800 rounded-lg p-4 flex flex-col gap-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="text-base font-semibold truncate">{w.name}</h3>
                <p className="text-xs text-zinc-500 truncate">
                  {w.description || 'No description'}
                </p>
              </div>
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={w.enabled}
                  onChange={() => onToggle(w)}
                  data-testid={`workflow-toggle-${w.id}`}
                  className="accent-blue-500"
                />
                {w.enabled ? 'On' : 'Off'}
              </label>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span
                className={cn(
                  'px-2 py-0.5 rounded',
                  w.trigger.type === 'schedule'
                    ? 'bg-blue-900/40 text-blue-300'
                    : 'bg-purple-900/40 text-purple-300',
                )}
              >
                {w.trigger.type === 'schedule' ? (
                  <span className="flex items-center gap-1">
                    <Clock size={12} />
                    {(w.trigger.config as ScheduleTriggerConfig).cron}
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Mail size={12} />
                    {(w.trigger.config as EventTriggerConfig).source}
                  </span>
                )}
              </span>
              <span className="text-zinc-500">{w.actions.length} actions</span>
              {lastRun && (
                <span
                  className={cn(
                    'ml-auto px-2 py-0.5 rounded',
                    lastRun.status === 'success' && 'bg-emerald-900/40 text-emerald-300',
                    lastRun.status === 'failed' && 'bg-red-900/40 text-red-300',
                    lastRun.status === 'running' && 'bg-amber-900/40 text-amber-300',
                  )}
                >
                  Last: {lastRun.status}
                </span>
              )}
            </div>

            <p className="text-xs text-zinc-500">Updated {formatDate(w.updatedAt)}</p>

            <div className="flex items-center gap-2 mt-auto pt-2 border-t border-zinc-800">
              <button
                onClick={() => onEdit(w)}
                data-testid={`workflow-edit-${w.id}`}
                className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600"
              >
                Edit
              </button>
              <button
                onClick={() => onTest(w.id)}
                disabled={loading}
                data-testid={`workflow-run-${w.id}`}
                className="text-xs px-2 py-1 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 flex items-center gap-1"
              >
                <Play size={12} />
                Run
              </button>
              <button
                onClick={() => onHistory(w)}
                data-testid={`workflow-history-${w.id}`}
                className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 flex items-center gap-1"
              >
                <History size={12} />
                History
              </button>
              <button
                onClick={() => onDelete(w.id)}
                data-testid={`workflow-delete-${w.id}`}
                className="text-xs ml-auto p-1 rounded text-zinc-400 hover:text-red-400"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function WorkflowBuilder({
  draft,
  onChange,
  onSave,
  onDelete,
  onTest,
  onAddAction,
  onUpdateAction,
  onRemoveAction,
  loading,
}: {
  draft: ReturnType<typeof emptyDraft>;
  onChange: (d: ReturnType<typeof emptyDraft>) => void;
  onSave: () => void;
  onDelete?: () => void;
  onTest?: () => void;
  onAddAction: () => void;
  onUpdateAction: (i: number, a: WorkflowAction) => void;
  onRemoveAction: (i: number) => void;
  loading: boolean;
}) {
  const triggerType = draft.trigger.type;

  return (
    <div data-testid="workflow-builder" className="max-w-2xl mx-auto space-y-6">
      <div className="space-y-3">
        <label className="block">
          <span className="text-sm text-zinc-400">Name</span>
          <input
            value={draft.name}
            onChange={(e) => onChange({ ...draft, name: e.target.value })}
            data-testid="workflow-name"
            className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
            placeholder="Daily summary"
          />
        </label>
        <label className="block">
          <span className="text-sm text-zinc-400">Description</span>
          <textarea
            value={draft.description}
            onChange={(e) => onChange({ ...draft, description: e.target.value })}
            data-testid="workflow-description"
            rows={2}
            className="mt-1 w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </label>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-300">Trigger</h3>
        <div className="flex items-center gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="trigger-type"
              checked={triggerType === 'schedule'}
              onChange={() =>
                onChange({
                  ...draft,
                  trigger: {
                    type: 'schedule',
                    config: { cron: 'daily' } as ScheduleTriggerConfig,
                  },
                })
              }
              data-testid="trigger-schedule"
            />
            Schedule
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="trigger-type"
              checked={triggerType === 'event'}
              onChange={() =>
                onChange({
                  ...draft,
                  trigger: {
                    type: 'event',
                    config: { source: 'email', condition: '' } as EventTriggerConfig,
                  },
                })
              }
              data-testid="trigger-event"
            />
            Event
          </label>
        </div>

        {triggerType === 'schedule' ? (
          <div className="rounded border border-zinc-800 bg-zinc-800/40 p-3 space-y-2">
            <label className="block">
              <span className="text-xs text-zinc-400">Frequency</span>
              <select
                value={(draft.trigger.config as ScheduleTriggerConfig).cron}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    trigger: {
                      type: 'schedule',
                      config: { cron: e.target.value } as ScheduleTriggerConfig,
                    },
                  })
                }
                data-testid="trigger-schedule-cron"
                className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
              >
                {SCHEDULE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : (
          <div className="rounded border border-zinc-800 bg-zinc-800/40 p-3 space-y-2">
            <label className="block">
              <span className="text-xs text-zinc-400">Source</span>
              <select
                value={(draft.trigger.config as EventTriggerConfig).source}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    trigger: {
                      type: 'event',
                      config: {
                        source: e.target.value as EventTriggerConfig['source'],
                        condition:
                          (draft.trigger.config as EventTriggerConfig).condition || '',
                      },
                    },
                  })
                }
                data-testid="trigger-event-source"
                className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
              >
                <option value="email">Email</option>
                <option value="calendar">Calendar</option>
                <option value="slack">Slack</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-zinc-400">Condition</span>
              <input
                value={(draft.trigger.config as EventTriggerConfig).condition}
                onChange={(e) =>
                  onChange({
                    ...draft,
                    trigger: {
                      type: 'event',
                      config: {
                        source: (draft.trigger.config as EventTriggerConfig).source,
                        condition: e.target.value,
                      },
                    },
                  })
                }
                placeholder="subject contains 'urgent'"
                data-testid="trigger-event-condition"
                className="mt-1 w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
              />
            </label>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-zinc-300">Actions</h3>

        <div className="rounded border border-blue-700/40 bg-blue-900/10 px-3 py-2 text-xs text-blue-200">
          Trigger
        </div>

        {draft.actions.map((action, idx) => (
          <div key={action.id}>
            <div className="flex justify-center my-1 text-zinc-600">
              <ArrowDown size={14} />
            </div>
            <ActionEditor
              index={idx}
              action={action}
              onChange={(a) => onUpdateAction(idx, a)}
              onRemove={() => onRemoveAction(idx)}
            />
          </div>
        ))}

        <button
          onClick={onAddAction}
          data-testid="workflow-add-action"
          className="w-full mt-2 px-3 py-2 border border-dashed border-zinc-700 rounded text-sm text-zinc-400 hover:bg-zinc-800/40 flex items-center justify-center gap-2"
        >
          <Plus size={14} />
          Add Action
        </button>
      </section>

      <section className="space-y-3">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(e) => onChange({ ...draft, enabled: e.target.checked })}
            data-testid="workflow-enabled"
            className="accent-blue-500"
          />
          Enable workflow
        </label>
      </section>

      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={loading}
          data-testid="workflow-save"
          className="px-4 py-2 rounded bg-blue-600 hover:bg-blue-500 text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Save size={14} />
          Save
        </button>
        {onTest && (
          <button
            onClick={onTest}
            disabled={loading}
            data-testid="workflow-test"
            className="px-4 py-2 rounded bg-zinc-700 hover:bg-zinc-600 text-sm flex items-center gap-2 disabled:opacity-50"
          >
            <Play size={14} />
            Test
          </button>
        )}
        {onDelete && (
          <button
            onClick={onDelete}
            data-testid="workflow-delete-builder"
            className="ml-auto px-4 py-2 rounded bg-red-700/30 hover:bg-red-700/50 text-sm flex items-center gap-2"
          >
            <Trash2 size={14} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}

function ActionEditor({
  index,
  action,
  onChange,
  onRemove,
}: {
  index: number;
  action: WorkflowAction;
  onChange: (a: WorkflowAction) => void;
  onRemove: () => void;
}) {
  const updateConfig = (patch: Record<string, unknown>) => {
    onChange({ ...action, config: { ...action.config, ...patch } });
  };

  const changeType = (type: WorkflowActionType) => {
    onChange({ ...action, type, config: defaultActionConfig(type) });
  };

  return (
    <div
      data-testid={`workflow-action-${index}`}
      className="rounded border border-zinc-800 bg-zinc-800/40 p-3 space-y-2"
    >
      <div className="flex items-center justify-between gap-2">
        <select
          value={action.type}
          onChange={(e) => changeType(e.target.value as WorkflowActionType)}
          data-testid={`workflow-action-type-${index}`}
          className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm"
        >
          {Object.entries(ACTION_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          onClick={onRemove}
          data-testid={`workflow-action-remove-${index}`}
          className="p-1 text-zinc-500 hover:text-red-400"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="space-y-2 text-sm">
        {action.type === 'send_slack' && (
          <>
            <input
              value={String(action.config.channel ?? '')}
              onChange={(e) => updateConfig({ channel: e.target.value })}
              placeholder="#channel or channel ID"
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
            />
            <textarea
              value={String(action.config.text ?? '')}
              onChange={(e) => updateConfig({ text: e.target.value })}
              rows={2}
              placeholder="Message text. Use {{input}} for previous output."
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
            />
          </>
        )}
        {action.type === 'send_email' && (
          <>
            <input
              value={String(action.config.to ?? '')}
              onChange={(e) => updateConfig({ to: e.target.value })}
              placeholder="recipient@example.com"
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
            />
            <input
              value={String(action.config.subject ?? '')}
              onChange={(e) => updateConfig({ subject: e.target.value })}
              placeholder="Subject"
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
            />
            <textarea
              value={String(action.config.body ?? '')}
              onChange={(e) => updateConfig({ body: e.target.value })}
              rows={3}
              placeholder="Body. Use {{input}} for previous output."
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
            />
          </>
        )}
        {action.type === 'generate_doc' && (
          <>
            <select
              value={String(action.config.docType ?? 'word')}
              onChange={(e) => updateConfig({ docType: e.target.value })}
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
            >
              <option value="word">Word</option>
              <option value="excel">Excel</option>
              <option value="ppt">PowerPoint</option>
            </select>
            <input
              value={String(action.config.title ?? '')}
              onChange={(e) => updateConfig({ title: e.target.value })}
              placeholder="Document title"
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
            />
            <textarea
              value={String(action.config.content ?? '')}
              onChange={(e) => updateConfig({ content: e.target.value })}
              rows={3}
              placeholder="Content. Use {{input}} for previous output."
              className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
            />
          </>
        )}
        {action.type === 'ai_process' && (
          <textarea
            value={String(action.config.prompt ?? '')}
            onChange={(e) => updateConfig({ prompt: e.target.value })}
            rows={3}
            placeholder="Prompt. Use {{input}} for previous output."
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
          />
        )}
        {action.type === 'save_memory' && (
          <textarea
            value={String(action.config.content ?? '')}
            onChange={(e) => updateConfig({ content: e.target.value })}
            rows={2}
            placeholder="Content. Use {{input}} for previous output."
            className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm"
          />
        )}
      </div>
    </div>
  );
}

function HistoryView({
  runs,
  onBack,
}: {
  runs: WorkflowRun[];
  onBack: () => void;
}) {
  return (
    <div data-testid="workflow-history" className="max-w-2xl mx-auto space-y-3">
      <button
        onClick={onBack}
        data-testid="workflow-history-back"
        className="text-sm text-zinc-400 hover:text-zinc-200"
      >
        ← Back to workflows
      </button>
      {runs.length === 0 ? (
        <p className="text-sm text-zinc-500">No runs yet.</p>
      ) : (
        runs.map((run) => (
          <RunRow key={run.id} run={run} />
        ))
      )}
    </div>
  );
}

function RunRow({ run }: { run: WorkflowRun }) {
  const [expanded, setExpanded] = useState(false);
  const duration = run.completedAt ? run.completedAt - run.startedAt : 0;
  return (
    <div
      data-testid={`workflow-run-${run.id}`}
      className="rounded border border-zinc-800 bg-zinc-800/40 p-3 text-sm"
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full"
      >
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'px-2 py-0.5 rounded text-xs',
              run.status === 'success' && 'bg-emerald-900/40 text-emerald-300',
              run.status === 'failed' && 'bg-red-900/40 text-red-300',
              run.status === 'running' && 'bg-amber-900/40 text-amber-300',
            )}
          >
            {run.status}
          </span>
          <span className="text-zinc-400">
            {new Date(run.startedAt).toLocaleString()}
          </span>
        </div>
        <span className="text-xs text-zinc-500">{duration}ms</span>
      </button>
      {expanded && run.results.length > 0 && (
        <div className="mt-2 space-y-1 text-xs text-zinc-400">
          {run.results.map((r, i) => (
            <div key={i} className="border-l-2 border-zinc-700 pl-2">
              <p className="font-mono text-zinc-500">action {i + 1}</p>
              {r.error ? (
                <p className="text-red-400">Error: {r.error}</p>
              ) : (
                <p className="truncate">
                  {typeof r.output === 'string' ? r.output : JSON.stringify(r.output)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
