import { describe, expect, test } from "bun:test";
import { jsonSyntaxRule } from "@/lint/rules/json-syntax.ts";

describe("json-syntax rule", () => {
  test("name is json-syntax", () => {
    expect(jsonSyntaxRule.name).toBe("json-syntax");
  });

  test("default severity is error", () => {
    expect(jsonSyntaxRule.defaultSeverity).toBe("error");
  });

  test("empty content returns violation", () => {
    const violations = jsonSyntaxRule.check(null, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("Empty file");
  });

  test("valid JSON returns no violations", () => {
    const json = JSON.stringify({ name: "test", nodes: [], connections: {} });
    const violations = jsonSyntaxRule.check(null, json);
    expect(violations.length).toBe(0);
  });

  test("invalid JSON returns violation", () => {
    const violations = jsonSyntaxRule.check(null, "{invalid json}");
    expect(violations.length).toBe(1);
    expect(violations[0]!.rule).toBe("json-syntax");
    expect(violations[0]!.severity).toBe("error");
  });

  test("violation has error message for syntax errors", () => {
    const json = '{\n  "name": "test",\n  invalid\n}';
    const violations = jsonSyntaxRule.check(null, json);
    expect(violations.length).toBe(1);
    expect(violations[0]!.rule).toBe("json-syntax");
    expect(violations[0]!.severity).toBe("error");
    expect(violations[0]!.message.length).toBeGreaterThan(0);
  });
});
