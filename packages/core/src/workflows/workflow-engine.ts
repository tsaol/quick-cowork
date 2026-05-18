import type {
  Workflow,
  WorkflowAction,
  WorkflowActionResult,
  WorkflowRun,
  ScheduleTriggerConfig,
  EventTriggerConfig,
  AppSettings,
  DocumentGenerateRequest,
} from '@quick-cowork/shared';
import { WorkflowStore } from './workflow-store.js';
import type { IntegrationManager } from '../integrations/integration-manager.js';
import type { MemoryStore } from '../memory/memory-store.js';
import type { ProviderManager } from '../llm/manager.js';
import { generateDocument } from '../documents/index.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;
const MIN_INTERVAL_MS = 60 * 1000;

export interface WorkflowEngineDeps {
  store: WorkflowStore;
  integrations: IntegrationManager;
  getMemoryStore: () => MemoryStore;
  providers: ProviderManager;
  getSettings: () => AppSettings;
  outputDir: string;
}

interface ScheduledTimer {
  workflowId: string;
  timer: NodeJS.Timeout;
}

interface EventListener {
  workflowId: string;
  source: EventTriggerConfig['source'];
  condition: string;
}

export class WorkflowEngine {
  private deps: WorkflowEngineDeps;
  private timers = new Map<string, ScheduledTimer>();
  private eventListeners = new Map<string, EventListener>();
  private runListeners = new Set<(run: WorkflowRun) => void>();

  constructor(deps: WorkflowEngineDeps) {
    this.deps = deps;
  }

  startAll(): void {
    const workflows = this.deps.store.list();
    for (const workflow of workflows) {
      if (workflow.enabled) {
        this.start(workflow);
      }
    }
  }

  stopAll(): void {
    for (const id of [...this.timers.keys()]) {
      this.stop(id);
    }
    this.eventListeners.clear();
  }

  start(workflow: Workflow): void {
    this.stop(workflow.id);
    if (workflow.trigger.type === 'schedule') {
      this.startSchedule(workflow);
    } else {
      this.registerEventListener(workflow);
    }
  }

  stop(workflowId: string): void {
    const t = this.timers.get(workflowId);
    if (t) {
      clearInterval(t.timer);
      this.timers.delete(workflowId);
    }
    this.eventListeners.delete(workflowId);
  }

  refresh(workflow: Workflow): void {
    if (workflow.enabled) {
      this.start(workflow);
    } else {
      this.stop(workflow.id);
    }
  }

  onRunComplete(listener: (run: WorkflowRun) => void): () => void {
    this.runListeners.add(listener);
    return () => this.runListeners.delete(listener);
  }

  private startSchedule(workflow: Workflow): void {
    const config = workflow.trigger.config as ScheduleTriggerConfig;
    const intervalMs = this.cronToInterval(config.cron);
    if (intervalMs <= 0) return;
    const timer = setInterval(() => {
      this.executeWorkflow(workflow.id).catch((err) => {
        console.error(`[WorkflowEngine] schedule run failed for ${workflow.id}:`, err);
      });
    }, intervalMs);
    this.timers.set(workflow.id, { workflowId: workflow.id, timer });
  }

  private cronToInterval(cron: string): number {
    switch (cron) {
      case 'hourly':
        return HOUR_MS;
      case 'daily':
        return DAY_MS;
      case 'every_5min':
        return 5 * 60 * 1000;
      case 'every_15min':
        return 15 * 60 * 1000;
      case 'every_30min':
        return 30 * 60 * 1000;
      default: {
        const numeric = Number(cron);
        if (Number.isFinite(numeric) && numeric >= MIN_INTERVAL_MS) {
          return numeric;
        }
        return DAY_MS;
      }
    }
  }

  private registerEventListener(workflow: Workflow): void {
    const config = workflow.trigger.config as EventTriggerConfig;
    this.eventListeners.set(workflow.id, {
      workflowId: workflow.id,
      source: config.source,
      condition: config.condition,
    });
  }

  emitEvent(source: EventTriggerConfig['source'], payload: Record<string, unknown>): void {
    for (const listener of this.eventListeners.values()) {
      if (listener.source !== source) continue;
      if (!this.matchesCondition(listener.condition, payload)) continue;
      this.executeWorkflow(listener.workflowId, payload).catch((err) => {
        console.error(
          `[WorkflowEngine] event run failed for ${listener.workflowId}:`,
          err,
        );
      });
    }
  }

  private matchesCondition(condition: string, payload: Record<string, unknown>): boolean {
    if (!condition || condition.trim() === '') return true;
    const containsMatch = condition.match(/(\w+)\s+contains\s+['"]([^'"]+)['"]/i);
    if (containsMatch) {
      const field = containsMatch[1];
      const needle = containsMatch[2].toLowerCase();
      const value = String(payload[field] ?? '').toLowerCase();
      return value.includes(needle);
    }
    const equalsMatch = condition.match(/(\w+)\s*=\s*['"]([^'"]+)['"]/);
    if (equalsMatch) {
      const field = equalsMatch[1];
      const expected = equalsMatch[2];
      return String(payload[field] ?? '') === expected;
    }
    return true;
  }

  async executeWorkflow(
    workflowId: string,
    initialInput: unknown = null,
  ): Promise<WorkflowRun> {
    const workflow = this.deps.store.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow not found: ${workflowId}`);
    }
    const run = this.deps.store.recordRunStart(workflow.id);
    const results: WorkflowActionResult[] = [];
    let lastOutput: unknown = initialInput;
    let failed = false;

    for (const action of workflow.actions) {
      const result: WorkflowActionResult = { actionId: action.id, output: null };
      try {
        lastOutput = await this.runAction(action, lastOutput);
        result.output = lastOutput;
      } catch (err) {
        result.error = err instanceof Error ? err.message : String(err);
        results.push(result);
        failed = true;
        break;
      }
      results.push(result);
    }

    const status = failed ? 'failed' : 'success';
    this.deps.store.recordRunComplete(run.id, status, results);
    const finalRun: WorkflowRun = {
      ...run,
      status,
      completedAt: Date.now(),
      results,
    };
    for (const listener of this.runListeners) {
      try {
        listener(finalRun);
      } catch (err) {
        console.error('[WorkflowEngine] run listener failed:', err);
      }
    }
    return finalRun;
  }

  private async runAction(action: WorkflowAction, input: unknown): Promise<unknown> {
    const config = action.config || {};
    switch (action.type) {
      case 'send_slack':
        return this.runSendSlack(config, input);
      case 'send_email':
        return this.runSendEmail(config, input);
      case 'generate_doc':
        return this.runGenerateDoc(config, input);
      case 'ai_process':
        return this.runAiProcess(config, input);
      case 'save_memory':
        return this.runSaveMemory(config, input);
      default:
        throw new Error(`Unknown action type: ${(action as WorkflowAction).type}`);
    }
  }

  private async runSendSlack(config: Record<string, unknown>, input: unknown): Promise<unknown> {
    const channel = String(config.channel ?? '');
    const text = this.interpolate(String(config.text ?? '{{input}}'), input);
    if (!channel) throw new Error('send_slack: missing channel');
    return this.deps.integrations.slack.sendMessage(channel, text);
  }

  private async runSendEmail(config: Record<string, unknown>, input: unknown): Promise<unknown> {
    const to = String(config.to ?? '');
    const subject = this.interpolate(String(config.subject ?? ''), input);
    const body = this.interpolate(String(config.body ?? '{{input}}'), input);
    if (!to) throw new Error('send_email: missing to');
    await this.deps.integrations.gmail.sendEmail(to, subject, body);
    return { to, subject };
  }

  private async runGenerateDoc(
    config: Record<string, unknown>,
    input: unknown,
  ): Promise<unknown> {
    const docType = String(config.docType ?? 'word') as DocumentGenerateRequest['type'];
    const title = this.interpolate(String(config.title ?? 'Workflow Output'), input);
    const text = this.interpolate(
      String(config.content ?? '{{input}}'),
      input,
    );
    let request: DocumentGenerateRequest;
    if (docType === 'excel') {
      request = {
        type: 'excel',
        title,
        sheets: [
          {
            name: 'Sheet1',
            columns: ['Content'],
            rows: text.split('\n').map((line) => [line]),
          },
        ],
      };
    } else if (docType === 'ppt') {
      request = {
        type: 'ppt',
        title,
        slides: [{ title, content: text.split('\n').filter(Boolean) }],
      };
    } else {
      request = {
        type: 'word',
        title,
        content: [{ heading: title, paragraphs: text.split('\n').filter(Boolean) }],
      };
    }
    const buffer = await generateDocument(request);
    return { type: docType, title, bytes: buffer.length };
  }

  private async runAiProcess(config: Record<string, unknown>, input: unknown): Promise<unknown> {
    const promptTemplate = String(config.prompt ?? 'Summarize the following: {{input}}');
    const prompt = this.interpolate(promptTemplate, input);
    const settings = this.deps.getSettings();
    const providerId = String(config.provider ?? settings.provider);
    const model = String(config.model ?? settings.model);
    let output = '';
    for await (const chunk of this.deps.providers.chat(
      providerId,
      [{ role: 'user', content: prompt }],
      { model },
    )) {
      if (chunk.type === 'text') {
        output += chunk.content;
      } else if (chunk.type === 'error') {
        throw new Error(chunk.content || 'AI provider error');
      }
    }
    return output;
  }

  private async runSaveMemory(config: Record<string, unknown>, input: unknown): Promise<unknown> {
    const contentTemplate = String(config.content ?? '{{input}}');
    const content = this.interpolate(contentTemplate, input);
    const metadata = (config.metadata as Record<string, unknown>) || {};
    const memory = await this.deps.getMemoryStore().store(content, {
      ...metadata,
      source: 'workflow',
    });
    return { id: memory.id };
  }

  private interpolate(template: string, input: unknown): string {
    const inputStr =
      typeof input === 'string'
        ? input
        : input == null
          ? ''
          : JSON.stringify(input);
    return template.replace(/\{\{\s*input\s*\}\}/g, inputStr);
  }
}
