import type { Connection, Workflow } from "@/api/types.ts";
import type { Rule } from "./rule.ts";
import type { Violation } from "./violation.ts";

/** Checks for nodes not connected to any other nodes */
export const orphanedNodeRule: Rule = {
  name: "orphaned-node",
  description: "Check for nodes not connected to any other nodes",
  defaultSeverity: "warning",
  check(workflow: Workflow | null, _rawJSON: string): Violation[] {
    if (!workflow) return [];

    const violations: Violation[] = [];
    const sourceNodes = new Set<string>();
    const targetNodes = new Set<string>();

    for (const [sourceName, conn] of Object.entries(workflow.connections)) {
      for (const [_key, outputs] of Object.entries(conn)) {
        if (!Array.isArray(outputs)) continue;
        for (const targets of outputs) {
          if (!Array.isArray(targets)) continue;
          for (const target of targets as Connection[]) {
            sourceNodes.add(sourceName);
            targetNodes.add(target.node);
          }
        }
      }
    }

    for (const node of workflow.nodes) {
      // Skip sticky notes
      if (node.type === "n8n-nodes-base.stickyNote") continue;

      const isSource = sourceNodes.has(node.name);
      const isTarget = targetNodes.has(node.name);

      // Trigger nodes only need to be a source
      if (isTriggerNode(node.type)) {
        if (!isSource) {
          violations.push({
            rule: "orphaned-node",
            severity: "warning",
            message: `Trigger node "${node.name}" has no outgoing connections`,
          });
        }
        continue;
      }

      // Regular nodes need to be either source or target
      if (!isSource && !isTarget) {
        violations.push({
          rule: "orphaned-node",
          severity: "warning",
          message: `Node "${node.name}" is not connected to any other nodes`,
        });
      }
    }

    return violations;
  },
};

/** Checks if a node type is a trigger node */
export function isTriggerNode(nodeType: string): boolean {
  return (
    nodeType.endsWith("Trigger") || nodeType.includes(".trigger") || nodeType.includes("Trigger.")
  );
}
