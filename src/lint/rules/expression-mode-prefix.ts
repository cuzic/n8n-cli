import type { Workflow } from "@/api/types.ts";
import type { Rule } from "./rule.ts";
import type { Violation } from "./violation.ts";

/** Pattern matching {{ $... }} that indicates an n8n expression */
const expressionPattern = /\{\{\s*\$/;

/** Checks for expression strings missing the '=' prefix */
export const expressionModePrefixRule: Rule = {
  name: "expression-mode-prefix",
  description: "Check for expression strings missing the '=' prefix",
  defaultSeverity: "warning",
  check(workflow: Workflow | null, _rawJSON: string): Violation[] {
    if (!workflow) return [];

    const violations: Violation[] = [];

    for (const node of workflow.nodes) {
      if (node.type === "n8n-nodes-base.stickyNote") continue;

      const nodeViolations = scanParameters(
        node.name,
        node.type,
        "",
        (node.parameters as Record<string, unknown>) ?? {},
      );
      violations.push(...nodeViolations);
    }

    return violations;
  },
};

function scanParameters(
  nodeName: string,
  nodeType: string,
  prefix: string,
  params: Record<string, unknown>,
): Violation[] {
  const violations: Violation[] = [];

  for (const [paramName, value] of Object.entries(params)) {
    if (paramName === "jsCode") continue;
    if (paramName === "inputSchema") continue;

    const fullPath = prefix ? `${prefix}.${paramName}` : paramName;
    violations.push(...scanValue(nodeName, nodeType, fullPath, value));
  }

  return violations;
}

function scanValue(
  nodeName: string,
  nodeType: string,
  paramPath: string,
  value: unknown,
): Violation[] {
  const violations: Violation[] = [];

  if (typeof value === "string") {
    if (isMissingPrefix(value)) {
      violations.push({
        rule: "expression-mode-prefix",
        severity: "warning",
        message: `Node "${nodeName}" parameter "${paramPath}" contains expression {{ $... }} but is missing the '=' prefix. Add '=' at the beginning to enable expression mode (e.g., '=value {{ $json.field }}')`,
      });
    }
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      violations.push(...scanValue(nodeName, nodeType, `${paramPath}.${key}`, val));
    }
  } else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      violations.push(...scanValue(nodeName, nodeType, `${paramPath}[${i}]`, value[i]));
    }
  }

  return violations;
}

function isMissingPrefix(s: string): boolean {
  if (!expressionPattern.test(s)) return false;
  if (s.length > 0 && s[0] === "=") return false;
  return true;
}
