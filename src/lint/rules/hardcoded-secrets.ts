import type { Workflow } from "@/api/types.ts";
import type { Rule } from "./rule.ts";
import type { Violation } from "./violation.ts";

/** Secret detection patterns with their descriptive names */
const SECRET_PATTERNS: { pattern: RegExp; name: string }[] = [
  // OpenAI API keys
  { pattern: /sk-[A-Za-z0-9]{20,}/, name: "OpenAI API Key" },
  // Stripe keys
  { pattern: /(sk|pk)_(test|live)_[A-Za-z0-9]{24,}/, name: "Stripe Key" },
  // GitHub tokens
  { pattern: /(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{36,}/, name: "GitHub Token" },
  // JWT tokens
  {
    pattern: /eyJ[A-Za-z0-9_-]{20,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
    name: "JWT Token",
  },
  // AWS keys
  { pattern: /AKIA[A-Z0-9]{16}/, name: "AWS Access Key" },
  // Bearer tokens in strings
  { pattern: /Bearer\s+[A-Za-z0-9_-]{20,}/i, name: "Bearer Token" },
  // Basic auth credentials
  { pattern: /Basic\s+[A-Za-z0-9+/=]{20,}/i, name: "Basic Auth" },
  // Connection strings with credentials (postgres://user:pass@host)
  { pattern: /:\/\/[^:/]+:[^@/]+@/, name: "Connection String with Password" },
  // Slack tokens
  { pattern: /xox[baprs]-[A-Za-z0-9-]{10,}/, name: "Slack Token" },
  // Google API keys
  { pattern: /AIza[A-Za-z0-9_-]{35}/, name: "Google API Key" },
  // Anthropic API keys
  { pattern: /sk-ant-[A-Za-z0-9-]{20,}/, name: "Anthropic API Key" },
];

/** Checks if the value is a dynamic reference (credential ref or env var) */
function isDynamicRef(value: string): boolean {
  return (
    value.includes("$credentials") ||
    value.includes("$env") ||
    value.startsWith("=") ||
    value.includes("={{ ")
  );
}

/** Checks if the value is a UUID (safe pattern to skip) */
function isUUID(value: string): boolean {
  return /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value);
}

/** Detects if a string value contains a hardcoded secret */
function detectSecret(value: string): string | null {
  // Skip short strings
  if (value.length < 16) return null;

  // Skip dynamic references
  if (isDynamicRef(value)) return null;

  // Skip UUIDs
  if (isUUID(value)) return null;

  // Test against all secret patterns
  for (const { pattern, name } of SECRET_PATTERNS) {
    if (pattern.test(value)) {
      return name;
    }
  }

  return null;
}

/** Checks for hardcoded secrets in node parameters */
export const hardcodedSecretsRule: Rule = {
  name: "hardcoded-secrets",
  description: "Check for hardcoded secrets, API keys, or credentials in node parameters",
  defaultSeverity: "error",
  check(workflow: Workflow | null, _rawJSON: string): Violation[] {
    if (!workflow) return [];

    const violations: Violation[] = [];

    for (const node of workflow.nodes) {
      if (node.type === "n8n-nodes-base.stickyNote") continue;

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
    const secretType = detectSecret(value);
    if (secretType) {
      violations.push({
        rule: "hardcoded-secrets",
        severity: "error",
        message: `Node "${nodeName}" contains hardcoded ${secretType} in parameter "${paramPath}". Move secrets to Credentials or use environment variables with {{ $env.VAR_NAME }}`,
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
