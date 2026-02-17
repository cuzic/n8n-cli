import type { Workflow } from "@/api/types.ts";
import { getKnownOutputFields, getNodeByName, parseNodeRefs } from "./node-schema.ts";
import type { Rule } from "./rule.ts";
import type { Violation } from "./violation.ts";

/** Checks that referenced node output fields exist in the node's known output schema */
export const nodeRefFieldCheckRule: Rule = {
  name: "node-ref-field-check",
  description: "Check that referenced node output fields exist in the node's known output schema",
  defaultSeverity: "warning",
  check(workflow: Workflow | null, _rawJSON: string): Violation[] {
    if (!workflow) return [];

    const violations: Violation[] = [];

    for (const node of workflow.nodes) {
      if (node.type === "n8n-nodes-base.stickyNote") continue;
      const nodeViolations = scanParameters(
        node.name,
        "",
        (node.parameters as Record<string, unknown>) ?? {},
        workflow,
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
): Violation[] {
  const violations: Violation[] = [];

  for (const [paramName, value] of Object.entries(params)) {
    // Skip inputSchema - contains JSON Schema definitions, not runtime references
    if (paramName === "inputSchema") continue;

    const fullPath = prefix ? `${prefix}.${paramName}` : paramName;
    violations.push(...scanValue(nodeName, fullPath, value, workflow));
  }

  return violations;
}

function scanValue(
  nodeName: string,
  paramPath: string,
  value: unknown,
  workflow: Workflow,
): Violation[] {
  const violations: Violation[] = [];

  if (typeof value === "string") {
    const refs = parseNodeRefs(value);
    for (const ref of refs) {
      const v = checkFieldRef(nodeName, paramPath, ref, workflow);
      if (v) violations.push(v);
    }
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      violations.push(...scanValue(nodeName, `${paramPath}.${key}`, val, workflow));
    }
  } else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      violations.push(...scanValue(nodeName, `${paramPath}[${i}]`, value[i], workflow));
    }
  }

  return violations;
}

function checkFieldRef(
  nodeName: string,
  paramPath: string,
  ref: { nodeName: string; accessor: string; fieldPath: string },
  workflow: Workflow,
): Violation | null {
  // Find the referenced node
  const refNode = getNodeByName(workflow, ref.nodeName);
  if (!refNode) return null; // connection-reference rule handles this

  // Get known output fields
  const knownFields = getKnownOutputFields(refNode);
  if (!knownFields) return null; // dynamic or unknown fields

  // Check if the first segment of the field path is in known fields
  const dotIdx = ref.fieldPath.indexOf(".");
  const topField = dotIdx >= 0 ? ref.fieldPath.substring(0, dotIdx) : ref.fieldPath;

  if (knownFields.includes(topField)) return null;

  return {
    rule: "node-ref-field-check",
    severity: "warning",
    message: `Node "${nodeName}" references field "${ref.fieldPath}" on node "${ref.nodeName}" (${refNode.type}) in parameter "${paramPath}", but known output fields are: [${knownFields.join(", ")}]`,
  };
}
