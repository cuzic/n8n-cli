import type { Graph } from "./graph.ts";
import { buildGraph } from "./graph.ts";
import { calculateLayout, topologicalSort } from "./layout.ts";
import {
  ErrEmptyWorkflow,
  ErrReadOnlyFile,
  type FormatterWorkflow,
  isReadOnlyFile,
  isStickyNote,
  loadWorkflow,
  loadWorkflowAsync,
  saveWorkflow,
  snapToGrid,
} from "./workflow.ts";

/** PositionChange represents a change in node position */
export interface PositionChange {
  nodeName: string;
  oldPos: [number, number];
  newPos: [number, number];
}

/** ProcessResult represents the result of processing a single file */
export interface ProcessResult {
  filePath: string;
  success: boolean;
  error?: Error;
  changes: PositionChange[];
}

/** FormatOptions represents options for formatting workflows */
export interface FormatOptions {
  dryRun: boolean;
}

/** ApplyPositions updates node positions in the workflow from the graph */
export function applyPositions(workflow: FormatterWorkflow, graph: Graph): PositionChange[] {
  const changes: PositionChange[] = [];

  for (const node of workflow.nodes) {
    if (isStickyNote(node)) continue;

    const graphNode = graph.nodes.get(node.name);
    if (!graphNode) continue;

    const newX = snapToGrid(graphNode.position.x);
    const newY = snapToGrid(graphNode.position.y);

    const oldPos: [number, number] = [node.position[0], node.position[1]];
    const newPos: [number, number] = [newX, newY];

    if (oldPos[0] !== newPos[0] || oldPos[1] !== newPos[1]) {
      changes.push({ nodeName: node.name, oldPos, newPos });
    }

    node.position = newPos;
  }

  return changes;
}

/** FormatWorkflow formats a workflow file by reorganizing node positions */
export function formatWorkflow(filePath: string): ProcessResult {
  return formatWorkflowWithOptions(filePath, { dryRun: false });
}

/** FormatWorkflowWithOptions formats a workflow file with specified options */
export function formatWorkflowWithOptions(filePath: string, options: FormatOptions): ProcessResult {
  const result: ProcessResult = {
    filePath,
    success: false,
    changes: [],
  };

  let workflow: FormatterWorkflow;
  try {
    workflow = loadWorkflow(filePath);
  } catch (e) {
    result.error = e instanceof Error ? e : new Error(String(e));
    return result;
  }

  if (workflow.nodes.length === 0) {
    result.error = ErrEmptyWorkflow;
    return result;
  }

  const graph = buildGraph(workflow);

  if (graph.nodes.size === 0) {
    // Workflow only has sticky notes, nothing to format
    result.success = true;
    return result;
  }

  try {
    topologicalSort(graph);
  } catch (e) {
    result.error = e instanceof Error ? e : new Error(String(e));
    return result;
  }

  calculateLayout(graph);

  const changes = applyPositions(workflow, graph);

  if (!options.dryRun) {
    try {
      saveWorkflow(filePath, workflow);
    } catch (e) {
      result.error = e instanceof Error ? e : new Error(String(e));
      return result;
    }
  }

  result.success = true;
  result.changes = changes;
  return result;
}

/** FormatWorkflowAsync formats a workflow file (JSON/YAML/Jsonnet) with specified options */
export async function formatWorkflowAsync(
  filePath: string,
  options: FormatOptions,
): Promise<ProcessResult> {
  const result: ProcessResult = {
    filePath,
    success: false,
    changes: [],
  };

  let workflow: FormatterWorkflow;
  try {
    workflow = await loadWorkflowAsync(filePath);
  } catch (e) {
    result.error = e instanceof Error ? e : new Error(String(e));
    return result;
  }

  if (workflow.nodes.length === 0) {
    result.error = ErrEmptyWorkflow;
    return result;
  }

  const graph = buildGraph(workflow);

  if (graph.nodes.size === 0) {
    result.success = true;
    return result;
  }

  try {
    topologicalSort(graph);
  } catch (e) {
    result.error = e instanceof Error ? e : new Error(String(e));
    return result;
  }

  calculateLayout(graph);

  const changes = applyPositions(workflow, graph);

  if (!options.dryRun && !isReadOnlyFile(filePath)) {
    try {
      saveWorkflow(filePath, workflow);
    } catch (e) {
      result.error = e instanceof Error ? e : new Error(String(e));
      return result;
    }
  }

  result.success = true;
  result.changes = changes;
  if (isReadOnlyFile(filePath)) {
    result.error = ErrReadOnlyFile;
  }
  return result;
}
