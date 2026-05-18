import type {
  AgentDefinition,
  AgentExecutionResult,
  AppSettings,
  DocumentGenerateRequest,
} from '@quick-cowork/shared';
import type { ProviderManager } from '../llm/manager.js';
import type { ChatInput } from '../llm/provider.js';
import type { MemoryStore } from '../memory/memory-store.js';
import type { FileService } from '../files/file-service.js';
import { webSearch } from '../research/web-search.js';
import { generateDocument } from '../documents/index.js';

const MAX_TOOL_ITERATIONS = 4;

export interface AgentExecutorDeps {
  providerManager: ProviderManager;
  settings: AppSettings;
  memoryStore?: MemoryStore;
  fileService?: FileService;
}

interface ToolCallRecord {
  tool: string;
  input: Record<string, unknown>;
  output: unknown;
}

interface ParsedToolCall {
  tool: string;
  input: Record<string, unknown>;
}

const TOOL_DESCRIPTIONS: Record<string, string> = {
  web_search: 'Search the web. Input: { "query": "<search terms>" }',
  file_read: 'Read a file from allowed folders. Input: { "path": "<absolute path>" }',
  memory_search:
    'Search the user\'s long-term memory. Input: { "query": "<search terms>", "limit": 5 }',
  generate_document:
    'Generate a Word/Excel/PPT document. Input: a DocumentGenerateRequest object with type ("word"|"excel"|"ppt"), title, and content/sheets/slides.',
};

function buildSystemPrompt(agent: AgentDefinition): string {
  const tools = (agent.tools ?? []).filter((t) => TOOL_DESCRIPTIONS[t]);
  const toolBlock =
    tools.length === 0
      ? 'You have no tools available. Answer directly.'
      : [
          'You have access to the following tools:',
          ...tools.map((t) => `- ${t}: ${TOOL_DESCRIPTIONS[t]}`),
          '',
          'To use a tool, respond ONLY with a JSON object on a single line in this exact format:',
          '{"tool": "<tool_name>", "input": { ... }}',
          '',
          'After you receive a tool result, you may call another tool or produce the final answer.',
          'When you are ready to give the final answer, respond with plain text (no JSON).',
        ].join('\n');

  return [
    `You are "${agent.name}", a custom AI agent.`,
    '',
    'Instructions:',
    agent.instructions,
    '',
    toolBlock,
  ].join('\n');
}

function tryParseToolCall(text: string): ParsedToolCall | null {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{')) return null;

  let candidate = trimmed;
  if (candidate.startsWith('```')) {
    candidate = candidate.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  }

  try {
    const parsed = JSON.parse(candidate) as { tool?: unknown; input?: unknown };
    if (typeof parsed.tool !== 'string') return null;
    const input =
      parsed.input && typeof parsed.input === 'object' && !Array.isArray(parsed.input)
        ? (parsed.input as Record<string, unknown>)
        : {};
    return { tool: parsed.tool, input };
  } catch {
    return null;
  }
}

async function collectAssistantText(
  providerManager: ProviderManager,
  providerId: string,
  history: ChatInput[],
  options: { model?: string; temperature?: number },
): Promise<string> {
  let text = '';
  for await (const chunk of providerManager.chat(providerId, history, {
    model: options.model,
    temperature: options.temperature,
  })) {
    if (chunk.type === 'text') {
      text += chunk.content;
    } else if (chunk.type === 'error') {
      throw new Error(chunk.content || 'LLM error');
    }
  }
  return text.trim();
}

export class AgentExecutor {
  private deps: AgentExecutorDeps;

  constructor(deps: AgentExecutorDeps) {
    this.deps = deps;
  }

  async execute(agent: AgentDefinition, message: string): Promise<AgentExecutionResult> {
    const start = Date.now();
    const toolCalls: ToolCallRecord[] = [];

    const systemPrompt = buildSystemPrompt(agent);
    const history: ChatInput[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message },
    ];

    const { providerManager, settings } = this.deps;
    const providerId = settings.provider;
    const model = agent.model || settings.model;
    const temperature = agent.temperature ?? 0.7;

    let finalOutput = '';

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS + 1; iteration++) {
      const reply = await collectAssistantText(providerManager, providerId, history, {
        model,
        temperature,
      });

      const toolCall = tryParseToolCall(reply);
      if (!toolCall || iteration === MAX_TOOL_ITERATIONS) {
        finalOutput = reply;
        break;
      }

      if (!agent.tools.includes(toolCall.tool)) {
        history.push({ role: 'assistant', content: reply });
        history.push({
          role: 'user',
          content: `Tool "${toolCall.tool}" is not enabled for this agent. Please answer directly or use one of: ${agent.tools.join(', ')}.`,
        });
        continue;
      }

      let toolOutput: unknown;
      try {
        toolOutput = await this.runTool(toolCall.tool, toolCall.input);
      } catch (err) {
        toolOutput = {
          error: err instanceof Error ? err.message : 'Tool execution failed',
        };
      }

      toolCalls.push({ tool: toolCall.tool, input: toolCall.input, output: toolOutput });

      history.push({ role: 'assistant', content: reply });
      history.push({
        role: 'user',
        content: `Tool "${toolCall.tool}" returned:\n${JSON.stringify(toolOutput).slice(0, 4000)}\n\nContinue. Either call another tool or give the final answer in plain text.`,
      });
    }

    return {
      agentId: agent.id,
      output: finalOutput,
      toolCalls,
      duration: Date.now() - start,
    };
  }

  private async runTool(name: string, input: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'web_search': {
        const query = String(input.query ?? '');
        if (!query) throw new Error('web_search requires a "query" string');
        const result = await webSearch(query);
        return result.results.slice(0, 5);
      }
      case 'file_read': {
        const filePath = String(input.path ?? '');
        if (!filePath) throw new Error('file_read requires a "path" string');
        if (!this.deps.fileService) throw new Error('file_read is unavailable');
        const file = await this.deps.fileService.readFile(filePath);
        if (!file) throw new Error('File not allowed or unreadable');
        return { name: file.name, size: file.size, content: file.content?.slice(0, 5000) };
      }
      case 'memory_search': {
        const query = String(input.query ?? '');
        if (!query) throw new Error('memory_search requires a "query" string');
        if (!this.deps.memoryStore) throw new Error('memory_search is unavailable');
        const limitRaw = input.limit;
        const limit = typeof limitRaw === 'number' && limitRaw > 0 ? Math.min(limitRaw, 20) : 5;
        const results = await this.deps.memoryStore.search(query, limit);
        return results.map((r) => ({
          id: r.memory.id,
          content: r.memory.content,
          score: r.score,
        }));
      }
      case 'generate_document': {
        const request = input as unknown as DocumentGenerateRequest;
        const buffer = await generateDocument(request);
        return { sizeBytes: buffer.length, type: request.type, title: request.title };
      }
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }
}
