import type { Connection, Workflow } from "@/api/types.ts";
import type { Rule } from "./rule.ts";
import type { Violation } from "./violation.ts";

/** Checks that all connection references point to existing nodes */
export const connectionRefRule: Rule = {
  name: "connection-reference",
  description: "Check connections reference existing nodes",
  defaultSeverity: "error",
  check(workflow: Workflow | null, _rawJSON: string): Violation[] {
    if (!workflow) return [];

    const violations: Violation[] = [];
    const nodeNames = new Set(workflow.nodes.map((n) => n.name));

    for (const [sourceName, conn] of Object.entries(workflow.connections)) {
      // Check source node exists
      if (!nodeNames.has(sourceName)) {
        violations.push({
          rule: "connection-reference",
          severity: "error",
          message: `Connection source node "${sourceName}" does not exist in nodes list`,
        });
      }

      // Check all target nodes (main + ai_*)
      for (const [_key, outputs] of Object.entries(conn)) {
        if (!Array.isArray(outputs)) continue;
        for (const targets of outputs) {
          if (!Array.isArray(targets)) continue;
          for (const target of targets as Connection[]) {
            if (!nodeNames.has(target.node)) {
              violations.push({
                rule: "connection-reference",
                severity: "error",
                message: `Connection target node "${target.node}" does not exist in nodes list`,
              });
            }
          }
        }
      }
    }

    return violations;
  },
};
