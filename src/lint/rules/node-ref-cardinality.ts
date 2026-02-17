import type { Connection, Workflow } from "@/api/types.ts";
import { getNodeByName, getOutputSchema, parseNodeRefs } from "./node-schema.ts";
import type { Rule } from "./rule.ts";
import type { Violation } from "./violation.ts";

/** Checks that .item/.first() usage matches the referenced node's output cardinality */
export const nodeRefCardinalityRule: Rule = {
  name: "node-ref-cardinality",
  description: "Check that .item/.first() usage matches the referenced node's output cardinality",
  defaultSeverity: "warning",
  check(workflow: Workflow | null, _rawJSON: string): Violation[] {
    if (!workflow) return [];

    const adj = buildAdjacencyList(workflow);
    const nodeTypes = new Map<string, string>();
    for (const node of workflow.nodes) {
      nodeTypes.set(node.name, node.type);
    }

    const violations: Violation[] = [];

    for (const node of workflow.nodes) {
      if (node.type === "n8n-nodes-base.stickyNote") continue;
      const nodeViolations = scanParameters(
        node.name,
        "",
        (node.parameters as Record<string, unknown>) ?? {},
        workflow,
        adj,
        nodeTypes,
      );
      violations.push(...nodeViolations);
    }

    return violations;
  },
};

function scanParameters(
  nodeName: string,
  prefix: string,
  params: Record<string, unknown>,
  workflow: Workflow,
  adj: Map<string, string[]>,
  nodeTypes: Map<string, string>,
): Violation[] {
  const violations: Violation[] = [];
  for (const [paramName, value] of Object.entries(params)) {
    if (paramName === "inputSchema") continue;
    const fullPath = prefix ? `${prefix}.${paramName}` : paramName;
    violations.push(...scanValue(nodeName, fullPath, value, workflow, adj, nodeTypes));
  }
  return violations;
}

function scanValue(
  nodeName: string,
  paramPath: string,
  value: unknown,
  workflow: Workflow,
  adj: Map<string, string[]>,
  nodeTypes: Map<string, string>,
): Violation[] {
  const violations: Violation[] = [];

  if (typeof value === "string") {
    const refs = parseNodeRefs(value);
    for (const ref of refs) {
      const v = checkCardinalityRef(nodeName, paramPath, ref, workflow, adj, nodeTypes);
      if (v) violations.push(v);
    }
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      violations.push(...scanValue(nodeName, `${paramPath}.${key}`, val, workflow, adj, nodeTypes));
    }
  } else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      violations.push(
        ...scanValue(nodeName, `${paramPath}[${i}]`, value[i], workflow, adj, nodeTypes),
      );
    }
  }

  return violations;
}

function checkCardinalityRef(
  nodeName: string,
  paramPath: string,
  ref: { nodeName: string; accessor: string; fieldPath: string },
  workflow: Workflow,
  adj: Map<string, string[]>,
  nodeTypes: Map<string, string>,
): Violation | null {
  // Only check .item accessor (using .first() is always safe)
  if (ref.accessor !== "item") return null;

  const refNode = getNodeByName(workflow, ref.nodeName);
  if (!refNode) return null;

  const schema = getOutputSchema(refNode.type);
  if (!schema) return null;

  // Case A: N:1 node referenced with .item
  if (schema.cardinality === "N:1") {
    return {
      rule: "node-ref-cardinality",
      severity: "warning",
      message: `Node "${nodeName}" references "${ref.nodeName}" with .item in parameter "${paramPath}", but "${ref.nodeName}" (${refNode.type}) has N:1 cardinality. Use .first() instead of .item`,
    };
  }

  // Case B: 1:N node referenced with .item after a cardinality reducer
  if (schema.cardinality === "1:N") {
    const isReducer = (name: string): boolean => {
      const nodeType = nodeTypes.get(name);
      if (!nodeType) return false;
      const s = getOutputSchema(nodeType);
      return s != null && s.cardinality === "N:1";
    };

    if (hasCardinalityReducerOnPath(adj, ref.nodeName, nodeName, isReducer)) {
      return {
        rule: "node-ref-cardinality",
        severity: "warning",
        message: `Node "${nodeName}" references "${ref.nodeName}" with .item in parameter "${paramPath}", but a cardinality-reducing node exists between "${ref.nodeName}" (1:N) and "${nodeName}". Use .first() instead of .item`,
      };
    }
  }

  return null;
}

/** Creates a directed graph from workflow connections (main only) */
export function buildAdjacencyList(workflow: Workflow): Map<string, string[]> {
  const adj = new Map<string, string[]>();

  for (const [sourceName, conn] of Object.entries(workflow.connections)) {
    if (conn.main) {
      for (const targets of conn.main) {
        if (!Array.isArray(targets)) continue;
        for (const target of targets as Connection[]) {
          const existing = adj.get(sourceName) ?? [];
          existing.push(target.node);
          adj.set(sourceName, existing);
        }
      }
    }
  }

  return adj;
}

/** BFS to check if there's a cardinality-reducing node on any path from 'from' to 'to' */
export function hasCardinalityReducerOnPath(
  adj: Map<string, string[]>,
  from: string,
  to: string,
  isReducer: (name: string) => boolean,
): boolean {
  interface State {
    node: string;
    sawReducer: boolean;
  }

  const visited = new Set<string>();
  const queue: State[] = [{ node: from, sawReducer: false }];

  while (queue.length > 0) {
    const cur = queue.shift()!;

    for (const next of adj.get(cur.node) ?? []) {
      const sawReducer = cur.sawReducer || isReducer(next);

      if (next === to) {
        if (sawReducer) return true;
        continue;
      }

      if (!visited.has(next)) {
        visited.add(next);
        queue.push({ node: next, sawReducer });
      }
    }
  }

  return false;
}
