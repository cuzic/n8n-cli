import type { Violation } from "../rules/violation.ts";

/** Result represents the output of a lint operation */
export interface LintResult {
  violations: Violation[];
  filesChecked: number;
  filesFailed: number;
}

/** Returns the number of error-level violations */
export function errorCount(result: LintResult): number {
  return result.violations.filter((v) => v.severity === "error" || !v.severity).length;
}

/** Returns the number of warning-level violations */
export function warningCount(result: LintResult): number {
  return result.violations.filter((v) => v.severity === "warning").length;
}

/** Returns true if there are any error-level violations */
export function hasErrors(result: LintResult): boolean {
  return errorCount(result) > 0;
}
