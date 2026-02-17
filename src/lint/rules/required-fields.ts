import type { Workflow } from "@/api/types.ts";
import type { Rule } from "./rule.ts";
import type { Violation } from "./violation.ts";

/** Checks that required fields are present in the workflow */
export const requiredFieldsRule: Rule = {
  name: "required-fields",
  description: "Check required fields (name, nodes, connections) exist",
  defaultSeverity: "error",
  check(workflow: Workflow | null, _rawJSON: string): Violation[] {
    if (!workflow) return [];

    const violations: Violation[] = [];

    if (!workflow.name) {
      violations.push({
        rule: "required-fields",
        severity: "error",
        message: 'Missing required field: "name" (must not be empty)',
      });
    }

    if (workflow.nodes == null) {
      violations.push({
        rule: "required-fields",
        severity: "error",
        message: 'Missing required field: "nodes"',
      });
    }

    if (workflow.connections == null) {
      violations.push({
        rule: "required-fields",
        severity: "error",
        message: 'Missing required field: "connections"',
      });
    }

    return violations;
  },
};
