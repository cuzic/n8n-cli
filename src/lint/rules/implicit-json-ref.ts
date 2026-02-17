import type { Workflow } from "@/api/types.ts";
import type { Rule } from "./rule.ts";
import type { Violation } from "./violation.ts";

/** Pattern matching $json followed by dot notation or bracket notation */
const implicitJsonRefPattern = /\$json(?:\.[a-zA-Z_][a-zA-Z0-9_]*|\[)/g;

/** Checks for implicit $json references in node parameters */
export const implicitJsonRefRule: Rule = {
  name: "implicit-json-ref",
  description: "Check for implicit $json references (prefer explicit node references)",
  defaultSeverity: "warning",
  check(workflow: Workflow | null, _rawJSON: string): Violation[] {
    if (!workflow) return [];

    const violations: Violation[] = [];

    for (const node of workflow.nodes) {
      if (node.type === "n8n-nodes-base.code") {
        // For Code nodes, skip jsCode parameter
        const nodeViolations = checkParametersExceptJsCode(
          node.name,
          (node.parameters as Record<string, unknown>) ?? {},
        );
        violations.push(...nodeViolations);
        continue;
      }

      const nodeViolations = scanParameters(
        node.name,
        "",
        (node.parameters as Record<string, unknown>) ?? {},
      );
      violations.push(...nodeViolations);
    }

    return violations;
  },
};

function checkParametersExceptJsCode(
  nodeName: string,
  params: Record<string, unknown>,
): Violation[] {
  const violations: Violation[] = [];
  for (const [paramName, value] of Object.entries(params)) {
    if (paramName === "jsCode") continue;
    violations.push(...scanValue(nodeName, paramName, value));
  }
  return violations;
}

function scanParameters(
  nodeName: string,
  prefix: string,
  params: Record<string, unknown>,
): Violation[] {
  const violations: Violation[] = [];
  for (const [paramName, value] of Object.entries(params)) {
    const fullPath = prefix ? `${prefix}.${paramName}` : paramName;
    violations.push(...scanValue(nodeName, fullPath, value));
  }
  return violations;
}

function scanValue(nodeName: string, paramPath: string, value: unknown): Violation[] {
  const violations: Violation[] = [];

  if (typeof value === "string") {
    const re = new RegExp(implicitJsonRefPattern.source, "g");
    let match: RegExpExecArray | null;
    while ((match = re.exec(value)) !== null) {
      violations.push({
        rule: "implicit-json-ref",
        severity: "warning",
        message: `Node "${nodeName}" uses implicit $json reference "${match[0]}" in parameter "${paramPath}". Consider using explicit node reference like $('NodeName').item.json.field`,
      });
    }
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      violations.push(...scanValue(nodeName, `${paramPath}.${key}`, val));
    }
  } else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      violations.push(...scanValue(nodeName, `${paramPath}[${i}]`, value[i]));
    }
  }

  return violations;
}
