import { useEffect, useState } from 'react';
import {
  Server,
  Plus,
  Loader2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Play,
  Trash2,
  Plug,
  X,
} from 'lucide-react';
import type { McpServerConfig, McpTool, McpInvokeResponse } from '../../types';

interface ServerWithTools {
  config: McpServerConfig;
  tools: McpTool[] | null;
  toolsLoading: boolean;
  toolsError: string | null;
  expanded: boolean;
}

export function McpServersTab() {
  const [servers, setServers] = useState<ServerWithTools[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [command, setCommand] = useState('');
  const [argsText, setArgsText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [activeTool, setActiveTool] = useState<{
    serverId: string;
    tool: McpTool;
  } | null>(null);
  const [toolArgs, setToolArgs] = useState('{}');
  const [toolResult, setToolResult] = useState<McpInvokeResponse | null>(null);
  const [invoking, setInvoking] = useState(false);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await window.quickCowork.mcp.listServers();
      setServers((prev) => {
        const prevById = new Map(prev.map((s) => [s.config.id, s]));
        return list.map((cfg) => {
          const existing = prevById.get(cfg.id);
          return (
            existing ?? {
              config: cfg,
              tools: null,
              toolsLoading: false,
              toolsError: null,
              expanded: false,
            }
          );
        });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to list servers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const updateServer = (id: string, patch: Partial<ServerWithTools>) => {
    setServers((prev) =>
      prev.map((s) => (s.config.id === id ? { ...s, ...patch } : s)),
    );
  };

  const toggleExpand = async (id: string) => {
    const s = servers.find((x) => x.config.id === id);
    if (!s) return;
    if (!s.expanded && s.tools === null) {
      updateServer(id, { expanded: true, toolsLoading: true, toolsError: null });
      try {
        const tools = await window.quickCowork.mcp.listTools(id);
        updateServer(id, { tools, toolsLoading: false });
      } catch (err) {
        updateServer(id, {
          toolsLoading: false,
          toolsError: err instanceof Error ? err.message : 'Failed to list tools',
        });
      }
    } else {
      updateServer(id, { expanded: !s.expanded });
    }
  };

  const handleAdd = async () => {
    if (!name.trim() || !command.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const args = argsText
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
      const id = `${name.trim().toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
      await window.quickCowork.mcp.connect({
        id,
        name: name.trim(),
        command: command.trim(),
        args: args.length > 0 ? args : undefined,
      });
      setAddOpen(false);
      setName('');
      setCommand('');
      setArgsText('');
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect server');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    setError(null);
    try {
      await window.quickCowork.mcp.disconnect(id);
      setServers((prev) => prev.filter((s) => s.config.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disconnect');
    }
  };

  const openToolPanel = (serverId: string, tool: McpTool) => {
    setActiveTool({ serverId, tool });
    setToolResult(null);
    const props = (tool.inputSchema as { properties?: Record<string, unknown> })
      ?.properties;
    if (props && typeof props === 'object') {
      const stub: Record<string, unknown> = {};
      for (const key of Object.keys(props)) stub[key] = '';
      setToolArgs(JSON.stringify(stub, null, 2));
    } else {
      setToolArgs('{}');
    }
  };

  const handleInvoke = async () => {
    if (!activeTool) return;
    setInvoking(true);
    setToolResult(null);
    try {
      let parsed: Record<string, unknown> = {};
      if (toolArgs.trim()) {
        const obj = JSON.parse(toolArgs);
        if (obj && typeof obj === 'object') parsed = obj;
      }
      const res = await window.quickCowork.mcp.invoke(
        activeTool.serverId,
        activeTool.tool.name,
        parsed,
      );
      setToolResult(res);
    } catch (err) {
      setToolResult({
        content: err instanceof Error ? err.message : 'Invoke failed',
        isError: true,
      });
    } finally {
      setInvoking(false);
    }
  };

  return (
    <div className="px-6 py-4 space-y-4" data-testid="mcp-tab">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-medium text-zinc-100">MCP servers</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={refresh}
            disabled={loading}
            data-testid="mcp-refresh-button"
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg text-zinc-300 hover:bg-zinc-800 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <RefreshCw size={12} />
            )}
            Refresh
          </button>
          <button
            onClick={() => setAddOpen(true)}
            data-testid="mcp-add-button"
            className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Plus size={12} />
            Add server
          </button>
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 text-sm bg-red-900/30 border border-red-800 rounded-lg text-red-300">
          {error}
        </div>
      )}

      {servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-zinc-500">
          <Server size={32} className="mb-2 opacity-50" />
          <p className="text-sm">No MCP servers connected</p>
          <p className="text-xs mt-1">Add one with the button above</p>
        </div>
      ) : (
        <div className="space-y-2" data-testid="mcp-server-list">
          {servers.map((s) => (
            <div
              key={s.config.id}
              className="bg-zinc-800 border border-zinc-700 rounded-lg"
            >
              <div className="flex items-center gap-2 p-3">
                <button
                  onClick={() => toggleExpand(s.config.id)}
                  className="text-zinc-400 hover:text-zinc-200"
                >
                  {s.expanded ? (
                    <ChevronDown size={16} />
                  ) : (
                    <ChevronRight size={16} />
                  )}
                </button>
                <Server size={16} className="text-blue-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-100 truncate">
                    {s.config.name}
                  </p>
                  <p className="text-xs text-zinc-500 truncate font-mono">
                    {s.config.command}
                    {s.config.args && s.config.args.length > 0
                      ? ` ${s.config.args.join(' ')}`
                      : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleDisconnect(s.config.id)}
                  data-testid={`mcp-disconnect-${s.config.id}`}
                  className="flex items-center gap-1 px-2 py-1 text-xs rounded-md text-red-300 hover:bg-red-900/30 transition-colors"
                >
                  <Trash2 size={12} />
                  Disconnect
                </button>
              </div>

              {s.expanded && (
                <div className="border-t border-zinc-700 p-3 space-y-2">
                  {s.toolsLoading && (
                    <div className="flex items-center gap-2 text-xs text-zinc-500">
                      <Loader2 size={12} className="animate-spin" /> Loading tools...
                    </div>
                  )}
                  {s.toolsError && (
                    <div className="px-3 py-2 text-xs bg-red-900/30 border border-red-800 rounded text-red-300">
                      {s.toolsError}
                    </div>
                  )}
                  {s.tools && s.tools.length === 0 && (
                    <p className="text-xs text-zinc-500">No tools exposed</p>
                  )}
                  {s.tools &&
                    s.tools.map((t) => (
                      <button
                        key={t.name}
                        onClick={() => openToolPanel(s.config.id, t)}
                        data-testid={`mcp-tool-${s.config.id}-${t.name}`}
                        className="w-full text-left p-2 rounded-md bg-zinc-900 border border-zinc-700 hover:border-blue-500 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Play size={12} className="text-blue-400 shrink-0" />
                          <span className="text-sm font-mono text-zinc-100">
                            {t.name}
                          </span>
                        </div>
                        {t.description && (
                          <p className="text-xs text-zinc-500 mt-1 line-clamp-2">
                            {t.description}
                          </p>
                        )}
                      </button>
                    ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {addOpen && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => !submitting && setAddOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-zinc-900 border border-zinc-700 rounded-lg p-5 space-y-3"
            data-testid="mcp-add-modal"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium text-zinc-100">Add MCP server</h3>
              <button
                onClick={() => !submitting && setAddOpen(false)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X size={18} />
              </button>
            </div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Name (e.g. filesystem)"
              className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500"
            />
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Command (e.g. npx)"
              className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
            />
            <input
              value={argsText}
              onChange={(e) => setArgsText(e.target.value)}
              placeholder="Args, comma-separated (e.g. -y, @modelcontextprotocol/server-filesystem, /tmp)"
              className="w-full px-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setAddOpen(false)}
                disabled={submitting}
                className="px-3 py-2 text-sm rounded-lg text-zinc-300 hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={submitting || !name.trim() || !command.trim()}
                data-testid="mcp-add-submit"
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-white"
              >
                {submitting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Plug size={16} />
                )}
                Connect
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTool && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
          onClick={() => !invoking && setActiveTool(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-zinc-900 border border-zinc-700 rounded-lg p-5 space-y-3 max-h-[85vh] overflow-y-auto"
            data-testid="mcp-tool-modal"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-medium text-zinc-100 font-mono">
                  {activeTool.tool.name}
                </h3>
                {activeTool.tool.description && (
                  <p className="text-xs text-zinc-400 mt-1">
                    {activeTool.tool.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => !invoking && setActiveTool(null)}
                className="text-zinc-400 hover:text-zinc-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-1">
              <label className="block text-xs text-zinc-400">Input schema</label>
              <pre className="text-xs bg-zinc-950 border border-zinc-800 rounded p-2 max-h-40 overflow-y-auto text-zinc-400 font-mono">
                {JSON.stringify(activeTool.tool.inputSchema, null, 2)}
              </pre>
            </div>

            <div className="space-y-1">
              <label className="block text-xs text-zinc-400">Arguments (JSON)</label>
              <textarea
                value={toolArgs}
                onChange={(e) => setToolArgs(e.target.value)}
                rows={6}
                className="w-full px-3 py-2 text-xs bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {toolResult && (
              <div className="space-y-1">
                <label className="block text-xs text-zinc-400">
                  Result {toolResult.isError && <span className="text-red-400">(error)</span>}
                </label>
                <pre
                  className={`text-xs rounded p-2 max-h-60 overflow-y-auto font-mono ${
                    toolResult.isError
                      ? 'bg-red-900/30 border border-red-800 text-red-300'
                      : 'bg-zinc-950 border border-zinc-800 text-zinc-300'
                  }`}
                >
                  {typeof toolResult.content === 'string'
                    ? toolResult.content
                    : JSON.stringify(toolResult.content, null, 2)}
                </pre>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setActiveTool(null)}
                disabled={invoking}
                className="px-3 py-2 text-sm rounded-lg text-zinc-300 hover:bg-zinc-800"
              >
                Close
              </button>
              <button
                onClick={handleInvoke}
                disabled={invoking}
                data-testid="mcp-invoke-button"
                className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 text-white"
              >
                {invoking ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Play size={16} />
                )}
                Invoke
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
