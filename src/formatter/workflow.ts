import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadYamlWorkflow } from "@/yaml/loader.ts";

/** Constants for layout calculation */
export const GRID_SIZE = 20.0;
export const NODE_X_SPACING = 320.0;
export const NODE_Y_SPACING = 240.0;
export const NODE_WIDTH = 100.0;
export const NODE_HEIGHT = 100.0;
export const STICKY_NOTE_TYPE = "n8n-nodes-base.stickyNote";
export const LANGCHAIN_PREFIX = "@n8n/n8n-nodes-langchain.";

/** Error types */
export const ErrInvalidJSON = new Error("invalid JSON format");
export const ErrMissingNodes = new Error("nodes array not found");
export const ErrEmptyWorkflow = new Error("workflow has no nodes");
export const ErrCyclicGraph = new Error("cyclic dependencies detected");
export const ErrReadOnlyFile = new Error("file is read-only");

/** FormatterNode represents a single node in an n8n workflow (formatter-specific) */
export interface FormatterNode {
  id: string;
  name: string;
  type: string;
  typeVersion: number;
  position: [number, number];
  parameters: Record<string, unknown>;
  credentials?: Record<string, unknown>;
}

/** FormatterWorkflow represents an n8n workflow (formatter-specific) */
export interface FormatterWorkflow {
  id?: string;
  name: string;
  active: boolean;
  nodes: FormatterNode[];
  connections: Record<string, unknown>;
  settings?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

/** LoadWorkflow loads a workflow from a JSON file */
export function loadWorkflow(filePath: string): FormatterWorkflow {
  const data = readFileSync(filePath, "utf-8");

  let raw: unknown;
  try {
    raw = JSON.parse(data);
  } catch (e) {
    throw new Error(`${ErrInvalidJSON.message}: ${e instanceof Error ? e.message : String(e)}`);
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw ErrInvalidJSON;
  }

  const nodes = (raw as { nodes?: unknown }).nodes;
  if (!Array.isArray(nodes)) {
    throw ErrMissingNodes;
  }
  if (nodes.length === 0) {
    throw ErrEmptyWorkflow;
  }

  return raw as unknown as FormatterWorkflow;
}

/** Returns true if the file is a non-JSON format (YAML) that cannot be written back */
export function isReadOnlyFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return ext === ".yaml" || ext === ".yml";
}

/** SaveWorkflow saves a workflow to a JSON file with 2-space indentation */
export function saveWorkflow(filePath: string, workflow: FormatterWorkflow): void {
  if (isReadOnlyFile(filePath)) {
    throw ErrReadOnlyFile;
  }
  const data = JSON.stringify(workflow, null, 2);
  writeFileSync(filePath, data, "utf-8");
}

/** LoadWorkflowAsync loads a workflow from JSON or YAML file */
export async function loadWorkflowAsync(filePath: string): Promise<FormatterWorkflow> {
  const ext = path.extname(filePath).toLowerCase();

  let raw: unknown;

  if (ext === ".yaml" || ext === ".yml") {
    raw = loadYamlWorkflow(filePath);
  } else {
    return loadWorkflow(filePath);
  }

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw ErrInvalidJSON;
  }

  const nodes = (raw as { nodes?: unknown }).nodes;
  if (!Array.isArray(nodes)) {
    throw ErrMissingNodes;
  }
  if (nodes.length === 0) {
    throw ErrEmptyWorkflow;
  }

  return raw as unknown as FormatterWorkflow;
}

/** IsStickyNote checks if a node is a sticky note */
export function isStickyNote(node: FormatterNode): boolean {
  return node.type === STICKY_NOTE_TYPE;
}

/** IsLangChainSubNode checks if a node is a LangChain sub-node */
export function isLangChainSubNode(node: FormatterNode): boolean {
  if (!node.type.startsWith(LANGCHAIN_PREFIX)) {
    return false;
  }
  const subNodeTypes = [
    "lmChat",
    "lm",
    "outputParser",
    "embeddings",
    "vectorStore",
    "memory",
    "tool",
  ];
  const typeWithoutPrefix = node.type.slice(LANGCHAIN_PREFIX.length);
  return subNodeTypes.some((subType) => typeWithoutPrefix.startsWith(subType));
}

/** IsLangChainAgentNode checks if a node is a LangChain agent node */
export function isLangChainAgentNode(node: FormatterNode): boolean {
  return node.type.startsWith(LANGCHAIN_PREFIX) && node.type.includes("agent");
}

/** SnapToGrid snaps a coordinate to the nearest grid point */
export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE;
}
