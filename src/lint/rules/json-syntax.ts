import type { Workflow } from "@/api/types.ts";
import type { Rule } from "./rule.ts";
import type { Violation } from "./violation.ts";

/** Checks that the workflow file is valid JSON */
export const jsonSyntaxRule: Rule = {
  name: "json-syntax",
  description: "Check JSON syntax is valid",
  defaultSeverity: "error",
  check(_workflow: Workflow | null, rawJSON: string): Violation[] {
    if (!rawJSON || rawJSON.length === 0) {
      return [
        {
          rule: "json-syntax",
          severity: "error",
          message: "Empty file or no content",
        },
      ];
    }

    try {
      JSON.parse(rawJSON);
      return [];
    } catch (e) {
      const violation: Violation = {
        rule: "json-syntax",
        severity: "error",
        message: String(e instanceof Error ? e.message : e),
      };

      // Try to extract position from error message
      if (e instanceof SyntaxError) {
        const posMatch = /position\s+(\d+)/i.exec(e.message);
        if (posMatch?.[1]) {
          const offset = Number.parseInt(posMatch[1], 10);
          const [line, col] = offsetToLineCol(rawJSON, offset);
          violation.line = line;
          violation.column = col;
          violation.message = `JSON syntax error at position ${offset}: ${e.message}`;
        }
      }

      return [violation];
    }
  },
};

/** Converts a byte offset to line and column numbers */
function offsetToLineCol(data: string, offset: number): [number, number] {
  if (offset <= 0) return [1, 1];

  let line = 1;
  let lineStart = 0;

  for (let i = 0; i < offset && i < data.length; i++) {
    if (data[i] === "\n") {
      line++;
      lineStart = i + 1;
    }
  }

  let col = offset - lineStart + 1;
  if (col < 1) col = 1;

  return [line, col];
}
