import type { LintConfig } from "./config.ts";
import { getRuleSeverity, isRuleEnabled } from "./config.ts";
import type { Rule, Severity } from "./rules/rule.ts";

/** RuleWithConfig pairs a Rule with its configured severity */
export interface RuleWithConfig {
  rule: Rule;
  severity: Severity;
}

/** RuleRegistry manages all available lint rules */
export class RuleRegistry {
  private rules = new Map<string, Rule>();

  /** Register adds a rule to the registry */
  register(rule: Rule): void {
    this.rules.set(rule.name, rule);
  }

  /** Get returns a rule by name, or undefined if not found */
  get(name: string): Rule | undefined {
    return this.rules.get(name);
  }

  /** All returns all registered rules */
  all(): Rule[] {
    return Array.from(this.rules.values());
  }

  /** Names returns all registered rule names */
  names(): string[] {
    return Array.from(this.rules.keys());
  }

  /** EnabledRulesWithConfig returns rules filtered by config with their configured severities */
  enabledRulesWithConfig(config: LintConfig | null, disabledRules?: string[]): RuleWithConfig[] {
    const result: RuleWithConfig[] = [];
    const disabledSet = new Set(disabledRules ?? []);

    for (const [name, rule] of this.rules) {
      // Check CLI --disable-rule
      if (disabledSet.has(name)) continue;

      // Check config file
      if (!isRuleEnabled(config, name)) continue;

      // Determine severity
      let severity: Severity = rule.defaultSeverity;
      const configuredSeverity = getRuleSeverity(config, name);
      if (configuredSeverity === "error" || configuredSeverity === "warning") {
        severity = configuredSeverity;
      }

      result.push({ rule, severity });
    }

    return result;
  }
}
