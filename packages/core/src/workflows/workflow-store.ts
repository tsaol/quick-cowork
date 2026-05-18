import type Database from 'better-sqlite3';
import type {
  Workflow,
  WorkflowAction,
  WorkflowRun,
  WorkflowTrigger,
  WorkflowActionResult,
} from '@quick-cowork/shared';

interface WorkflowRow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  actions: string;
  enabled: number;
  created_at: number;
  updated_at: number;
}

interface RunRow {
  id: string;
  workflow_id: string;
  status: string;
  started_at: number;
  completed_at: number | null;
  results: string;
}

function rowToWorkflow(row: WorkflowRow): Workflow {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    trigger: JSON.parse(row.trigger) as WorkflowTrigger,
    actions: JSON.parse(row.actions) as WorkflowAction[],
    enabled: row.enabled === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function rowToRun(row: RunRow): WorkflowRun {
  return {
    id: row.id,
    workflowId: row.workflow_id,
    status: row.status as WorkflowRun['status'],
    startedAt: row.started_at,
    completedAt: row.completed_at ?? undefined,
    results: JSON.parse(row.results || '[]') as WorkflowActionResult[],
  };
}

export interface CreateWorkflowInput {
  name: string;
  description?: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  enabled?: boolean;
}

export interface UpdateWorkflowInput {
  name?: string;
  description?: string;
  trigger?: WorkflowTrigger;
  actions?: WorkflowAction[];
  enabled?: boolean;
}

export class WorkflowStore {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
  }

  list(): Workflow[] {
    const rows = this.db
      .prepare(
        'SELECT id, name, description, trigger, actions, enabled, created_at, updated_at FROM workflows ORDER BY updated_at DESC',
      )
      .all() as WorkflowRow[];
    return rows.map(rowToWorkflow);
  }

  get(id: string): Workflow | null {
    const row = this.db
      .prepare(
        'SELECT id, name, description, trigger, actions, enabled, created_at, updated_at FROM workflows WHERE id = ?',
      )
      .get(id) as WorkflowRow | undefined;
    return row ? rowToWorkflow(row) : null;
  }

  create(input: CreateWorkflowInput): Workflow {
    const id = crypto.randomUUID();
    const now = Date.now();
    const workflow: Workflow = {
      id,
      name: input.name,
      description: input.description ?? '',
      trigger: input.trigger,
      actions: input.actions,
      enabled: input.enabled ?? true,
      createdAt: now,
      updatedAt: now,
    };
    this.db
      .prepare(
        'INSERT INTO workflows (id, name, description, trigger, actions, enabled, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      )
      .run(
        workflow.id,
        workflow.name,
        workflow.description,
        JSON.stringify(workflow.trigger),
        JSON.stringify(workflow.actions),
        workflow.enabled ? 1 : 0,
        workflow.createdAt,
        workflow.updatedAt,
      );
    return workflow;
  }

  update(id: string, input: UpdateWorkflowInput): Workflow {
    const existing = this.get(id);
    if (!existing) {
      throw new Error(`Workflow not found: ${id}`);
    }
    const next: Workflow = {
      ...existing,
      name: input.name ?? existing.name,
      description: input.description ?? existing.description,
      trigger: input.trigger ?? existing.trigger,
      actions: input.actions ?? existing.actions,
      enabled: input.enabled ?? existing.enabled,
      updatedAt: Date.now(),
    };
    this.db
      .prepare(
        'UPDATE workflows SET name = ?, description = ?, trigger = ?, actions = ?, enabled = ?, updated_at = ? WHERE id = ?',
      )
      .run(
        next.name,
        next.description,
        JSON.stringify(next.trigger),
        JSON.stringify(next.actions),
        next.enabled ? 1 : 0,
        next.updatedAt,
        id,
      );
    return next;
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM workflows WHERE id = ?').run(id);
  }

  toggle(id: string, enabled: boolean): Workflow {
    return this.update(id, { enabled });
  }

  recordRunStart(workflowId: string): WorkflowRun {
    const id = crypto.randomUUID();
    const startedAt = Date.now();
    const run: WorkflowRun = {
      id,
      workflowId,
      status: 'running',
      startedAt,
      results: [],
    };
    this.db
      .prepare(
        'INSERT INTO workflow_runs (id, workflow_id, status, started_at, completed_at, results) VALUES (?, ?, ?, ?, ?, ?)',
      )
      .run(id, workflowId, 'running', startedAt, null, '[]');
    return run;
  }

  recordRunComplete(
    runId: string,
    status: 'success' | 'failed',
    results: WorkflowActionResult[],
  ): void {
    this.db
      .prepare(
        'UPDATE workflow_runs SET status = ?, completed_at = ?, results = ? WHERE id = ?',
      )
      .run(status, Date.now(), JSON.stringify(results), runId);
  }

  getHistory(workflowId: string, limit = 25): WorkflowRun[] {
    const rows = this.db
      .prepare(
        'SELECT id, workflow_id, status, started_at, completed_at, results FROM workflow_runs WHERE workflow_id = ? ORDER BY started_at DESC LIMIT ?',
      )
      .all(workflowId, limit) as RunRow[];
    return rows.map(rowToRun);
  }

  getLatestRun(workflowId: string): WorkflowRun | null {
    const row = this.db
      .prepare(
        'SELECT id, workflow_id, status, started_at, completed_at, results FROM workflow_runs WHERE workflow_id = ? ORDER BY started_at DESC LIMIT 1',
      )
      .get(workflowId) as RunRow | undefined;
    return row ? rowToRun(row) : null;
  }
}
