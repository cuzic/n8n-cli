import { describe, expect, test } from "bun:test";
import type { Workflow } from "@/api/types.ts";
import { requiredFieldsRule } from "@/lint/rules/required-fields.ts";

describe("required-fields rule", () => {
  test("name is required-fields", () => {
    expect(requiredFieldsRule.name).toBe("required-fields");
  });

  test("default severity is error", () => {
    expect(requiredFieldsRule.defaultSeverity).toBe("error");
  });

  test("null workflow returns no violations", () => {
    const violations = requiredFieldsRule.check(null, "");
    expect(violations.length).toBe(0);
  });

  test("valid workflow returns no violations", () => {
    const wf: Workflow = {
      name: "Test",
      active: false,
      nodes: [],
      connections: {},
    };
    const violations = requiredFieldsRule.check(wf, "");
    expect(violations.length).toBe(0);
  });

  test("missing name returns violation", () => {
    const wf = {
      name: "",
      active: false,
      nodes: [],
      connections: {},
    } as Workflow;
    const violations = requiredFieldsRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain('"name"');
  });

  test("null nodes returns violation", () => {
    const wf = {
      name: "Test",
      active: false,
      nodes: null as unknown as Workflow["nodes"],
      connections: {},
    } as Workflow;
    const violations = requiredFieldsRule.check(wf, "");
    expect(violations.some((v) => v.message.includes('"nodes"'))).toBe(true);
  });

  test("null connections returns violation", () => {
    const wf = {
      name: "Test",
      active: false,
      nodes: [],
      connections: null as unknown as Workflow["connections"],
    } as Workflow;
    const violations = requiredFieldsRule.check(wf, "");
    expect(violations.some((v) => v.message.includes('"connections"'))).toBe(true);
  });
});
