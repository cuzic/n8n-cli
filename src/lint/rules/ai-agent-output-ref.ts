import type { Connection, Workflow } from "@/api/types.ts";
import type { Rule } from "./rule.ts";
import type { Violation } from "./violation.ts";

const AI_AGENT_NODE_TYPE = "@n8n/n8n-nodes-langchain.agent";
const INCORRECT_OUTPUT_FIELDS = ["text", "response", "message", "result"];

/** Implicit incorrect pattern: $json.text/response/message/result */
const implicitIncorrectPattern = /\$json\.(text|response|message|result)\b/g;

/** Checks for incorrect references to AI Agent node outputs */
export const aiAgentOutputRefRule: Rule = {
  name: "ai-agent-output-ref",
  description:
    "Check for incorrect AI Agent output references (use $json.output, not $json.text/response/message)",
  defaultSeverity: "warning",
  check(workflow: Workflow | null, _rawJSON: string): Violation[] {
    if (!workflow) return [];

    // 1. Collect AI Agent node names
    const agentNames = new Set<string>();
    for (const node of workflow.nodes) {
      if (node.type === AI_AGENT_NODE_TYPE) {
        agentNames.add(node.name);
      }
    }
    if (agentNames.size === 0) return [];

    // 2. Find direct downstream nodes
    const downstreamNodes = new Set<string>();
    for (const [sourceName, conn] of Object.entries(workflow.connections)) {
      if (!agentNames.has(sourceName)) continue;
      if (conn.main) {
        for (const targets of conn.main) {
          if (!Array.isArray(targets)) continue;
          for (const target of targets as Connection[]) {
            downstreamNodes.add(target.node);
          }
        }
      }
    }

    // 3. Build explicit regex pattern
    const explicitPattern = buildExplicitPattern(agentNames);

    // 4. Scan nodes for incorrect references
    const violations: Violation[] = [];
    for (const node of workflow.nodes) {
      const isDownstream = downstreamNodes.has(node.name);
      const nodeViolations = scanNodeParameters(
        node.name,
        (node.parameters as Record<string, unknown>) ?? {},
        agentNames,
        explicitPattern,
        isDownstream,
      );
      violations.push(...nodeViolations);
    }

    return violations;
  },
};

function buildExplicitPattern(agentNames: Set<string>): RegExp | null {
  if (agentNames.size === 0) return null;

  const escaped = Array.from(agentNames).map(escapeRegex);
  const fields = INCORRECT_OUTPUT_FIELDS.join("|");
  const names = escaped.join("|");
  const pattern = `\\$\\(['"](${names})['"]\\)\\.(item|first\\(\\))\\.json\\.(${fields})\\b`;

  return new RegExp(pattern, "g");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scanNodeParameters(
  nodeName: string,
  params: Record<string, unknown>,
  agentNames: Set<string>,
  explicitPattern: RegExp | null,
  isDirectDownstream: boolean,
): Violation[] {
  const violations: Violation[] = [];
  for (const [paramName, value] of Object.entries(params)) {
    violations.push(
      ...scanValue(nodeName, paramName, value, agentNames, explicitPattern, isDirectDownstream),
    );
  }
  return violations;
}

function scanValue(
  nodeName: string,
  paramPath: string,
  value: unknown,
  agentNames: Set<string>,
  explicitPattern: RegExp | null,
  isDirectDownstream: boolean,
): Violation[] {
  const violations: Violation[] = [];

  if (typeof value === "string") {
    // Check explicit references
    if (explicitPattern) {
      const re = new RegExp(explicitPattern.source, "g");
      let match: RegExpExecArray | null;
      while ((match = re.exec(value)) !== null) {
        if (match.length >= 4) {
          violations.push({
            rule: "ai-agent-output-ref",
            severity: "warning",
            message: `Node "${nodeName}" references AI Agent "${match[1]}" output as .json.${match[3]} in parameter "${paramPath}". AI Agent output is always .json.output (use $('${match[1]}').item.json.output instead)`,
          });
        }
      }
    }

    // Check implicit references in downstream nodes
    if (isDirectDownstream) {
      const re = new RegExp(implicitIncorrectPattern.source, "g");
      let match: RegExpExecArray | null;
      while ((match = re.exec(value)) !== null) {
        if (match.length >= 2) {
          violations.push({
            rule: "ai-agent-output-ref",
            severity: "warning",
            message: `Node "${nodeName}" uses $json.${match[1]} in parameter "${paramPath}", but this node is directly downstream of an AI Agent. AI Agent output is always $json.output`,
          });
        }
      }
    }
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      violations.push(
        ...scanValue(
          nodeName,
          `${paramPath}.${key}`,
          val,
          agentNames,
          explicitPattern,
          isDirectDownstream,
        ),
      );
    }
  } else if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) {
      violations.push(
        ...scanValue(
          nodeName,
          `${paramPath}[${i}]`,
          value[i],
          agentNames,
          explicitPattern,
          isDirectDownstream,
        ),
      );
    }
  }

  return violations;
}
