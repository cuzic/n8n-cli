import type { Client } from "./client.ts";

/** ExecutionStatus represents the status of an execution */
export const ExecutionStatus = {
  NEW: "new",
  RUNNING: "running",
  SUCCESS: "success",
  ERROR: "error",
  WAITING: "waiting",
  CRASHED: "crashed",
} as const;

export type ExecutionStatus = (typeof ExecutionStatus)[keyof typeof ExecutionStatus];

/** Returns true if the execution status is terminal (no longer running) */
export function isTerminalStatus(status: ExecutionStatus): boolean {
  return (
    status === ExecutionStatus.SUCCESS ||
    status === ExecutionStatus.ERROR ||
    status === ExecutionStatus.CRASHED
  );
}

/** ExecutionError represents an error that occurred during execution */
export interface ExecutionError {
  message: string;
  description?: string;
  node?: string;
}

/** NodeExecutionData represents execution data for a single node */
export interface NodeExecutionData {
  startTime: number;
  executionTime: number;
  data?: Record<string, unknown[]>;
  error?: ExecutionError;
}

/** ResultData contains execution results */
export interface ResultData {
  runData?: Record<string, NodeExecutionData[]>;
  lastNodeExecuted?: string;
  error?: ExecutionError;
}

/** ExecutionData represents the data of an execution */
export interface ExecutionData {
  resultData?: ResultData;
}

/** Execution represents an n8n workflow execution */
export interface Execution {
  id: string;
  workflowId: string;
  status: ExecutionStatus;
  mode: string;
  startedAt?: string;
  stoppedAt?: string;
  data?: ExecutionData;
}

/** ListExecutionsOptions represents options for listing executions */
export interface ListExecutionsOptions {
  workflowId?: string;
  status?: ExecutionStatus;
  limit?: number;
  cursor?: string;
}

/** ListExecutionsResponse represents the response from listing executions */
export interface ListExecutionsResponse {
  data: Execution[];
  nextCursor?: string;
}

/** ExecutionService handles execution API operations */
export class ExecutionService {
  constructor(private readonly client: Client) {}

  /** ListExecutions lists executions with optional filters */
  async listExecutions(opts?: ListExecutionsOptions): Promise<ListExecutionsResponse> {
    const params = new URLSearchParams();

    if (opts) {
      if (opts.workflowId) {
        params.set("workflowId", opts.workflowId);
      }
      if (opts.status) {
        params.set("status", opts.status);
      }
      if (opts.limit && opts.limit > 0) {
        params.set("limit", String(opts.limit));
      }
      if (opts.cursor) {
        params.set("cursor", opts.cursor);
      }
    }

    const query = params.toString();
    const path = query ? `/executions?${query}` : "/executions";

    const data = await this.client.get(path);
    return JSON.parse(data) as ListExecutionsResponse;
  }

  /** GetExecution gets an execution by ID (includes full execution data for error details) */
  async getExecution(id: string): Promise<Execution> {
    const path = `/executions/${encodeURIComponent(id)}?includeData=true`;
    const data = await this.client.get(path);
    return JSON.parse(data) as Execution;
  }

  /** GetLatestExecution gets the most recent execution for a workflow */
  async getLatestExecution(workflowId: string): Promise<Execution | null> {
    const resp = await this.listExecutions({
      workflowId,
      limit: 1,
    });

    if (resp.data.length === 0) {
      return null;
    }

    return resp.data[0]!;
  }

  /** WaitForExecution polls for execution completion */
  async waitForExecution(
    id: string,
    timeoutMs: number,
    pollIntervalMs: number,
  ): Promise<Execution> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const exec = await this.getExecution(id);

      if (isTerminalStatus(exec.status)) {
        return exec;
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(`timeout waiting for execution ${id} to complete`);
  }
}
