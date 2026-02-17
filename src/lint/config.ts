import fs from "node:fs";

/** RuleConfig represents the configuration for a single rule */
export interface RuleConfig {
  enabled: boolean;
  /** "error", "warning", or empty for default */
  severity: string;
}

/** LintConfig represents the linter configuration loaded from .n8nlintrc.json */
export interface LintConfig {
  /** Rule configurations keyed by rule name */
  rulesConfig: Map<string, RuleConfig>;
}

/** Load reads and parses a lint config file. Returns default if not found. */
export function loadLintConfig(configPath?: string): LintConfig {
  const defaultConfig: LintConfig = { rulesConfig: new Map() };

  if (!configPath) {
    return defaultConfig;
  }

  let data: string;
  try {
    data = fs.readFileSync(configPath, "utf-8");
  } catch {
    // File doesn't exist or can't be read - return defaults
    return defaultConfig;
  }

  const raw = JSON.parse(data) as { rules?: Record<string, unknown> };
  const rulesConfig = new Map<string, RuleConfig>();

  if (raw.rules && typeof raw.rules === "object") {
    for (const [name, value] of Object.entries(raw.rules)) {
      if (typeof value === "boolean") {
        rulesConfig.set(name, { enabled: value, severity: "" });
      } else if (typeof value === "string") {
        switch (value) {
          case "error":
            rulesConfig.set(name, { enabled: true, severity: "error" });
            break;
          case "warning":
            rulesConfig.set(name, { enabled: true, severity: "warning" });
            break;
          case "off":
            rulesConfig.set(name, { enabled: false, severity: "" });
            break;
          default:
            throw new Error(
              `Invalid rule config value for "${name}": "${value}" (expected "error", "warning", or "off")`,
            );
        }
      } else {
        throw new Error(`Invalid rule config type for "${name}": expected bool or string`);
      }
    }
  }

  return { rulesConfig };
}

/** Checks if a rule is enabled in the config. Default: enabled. */
export function isRuleEnabled(config: LintConfig | null, ruleName: string): boolean {
  if (!config) return true;
  const rc = config.rulesConfig.get(ruleName);
  if (rc !== undefined) return rc.enabled;
  return true;
}

/** Returns the configured severity for a rule. Empty = use default. */
export function getRuleSeverity(config: LintConfig | null, ruleName: string): string {
  if (!config) return "";
  const rc = config.rulesConfig.get(ruleName);
  if (rc !== undefined) return rc.severity;
  return "";
}
