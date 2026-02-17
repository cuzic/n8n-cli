import { describe, expect, test } from "bun:test";
import type { Workflow } from "@/api/types.ts";
import { implicitJsonRefRule } from "@/lint/rules/implicit-json-ref.ts";

function makeWorkflow(nodes: Workflow["nodes"]): Workflow {
  return { name: "Test", active: false, nodes, connections: {} };
}

describe("implicit-json-ref rule", () => {
  test("name is implicit-json-ref", () => {
    expect(implicitJsonRefRule.name).toBe("implicit-json-ref");
  });

  test("default severity is warning", () => {
    expect(implicitJsonRefRule.defaultSeverity).toBe("warning");
  });

  test("null workflow returns no violations", () => {
    expect(implicitJsonRefRule.check(null, "").length).toBe(0);
  });

  test("explicit node reference only - no violations", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "HTTP Request",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 1,
        position: [0, 0],
        parameters: { url: "={{ $('Trigger').item.json.url }}" },
      },
    ]);
    expect(implicitJsonRefRule.check(wf, "").length).toBe(0);
  });

  test("$json.field dot notation - violation", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "HTTP Request",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 1,
        position: [0, 0],
        parameters: { url: "={{ $json.endpoint }}" },
      },
    ]);
    const violations = implicitJsonRefRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("$json.");
    expect(violations[0]!.message).toContain("HTTP Request");
    expect(violations[0]!.message).toContain("url");
  });

  test("$json['field'] bracket notation - violation", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "Set Node",
        type: "n8n-nodes-base.set",
        typeVersion: 1,
        position: [0, 0],
        parameters: { value: "={{ $json['fieldName'] }}" },
      },
    ]);
    const violations = implicitJsonRefRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("$json[");
  });

  test("Code node jsCode parameter - excluded from check", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "Code",
        type: "n8n-nodes-base.code",
        typeVersion: 1,
        position: [0, 0],
        parameters: { jsCode: "const data = $json.field; return data;" },
      },
    ]);
    expect(implicitJsonRefRule.check(wf, "").length).toBe(0);
  });

  test("Code node with other parameters containing $json - violation", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "Code",
        type: "n8n-nodes-base.code",
        typeVersion: 1,
        position: [0, 0],
        parameters: {
          jsCode: "const data = $json.field; return data;",
          mode: "={{ $json.mode }}",
        },
      },
    ]);
    const violations = implicitJsonRefRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("mode");
  });

  test("nested parameters - violation detected", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "Execute Workflow",
        type: "n8n-nodes-base.executeWorkflow",
        typeVersion: 1,
        position: [0, 0],
        parameters: {
          fieldsToSend: {
            values: [{ name: "email", value: "={{ $json.email }}" }],
          },
        },
      },
    ]);
    const violations = implicitJsonRefRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("$json.");
    expect(violations[0]!.message).toContain("Execute Workflow");
    expect(violations[0]!.message).toContain("fieldsToSend");
  });

  test("multiple violations in same node", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "HTTP Request",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 1,
        position: [0, 0],
        parameters: {
          url: "={{ $json.url }}",
          headers: "={{ $json.headers }}",
        },
      },
    ]);
    expect(implicitJsonRefRule.check(wf, "").length).toBe(2);
  });

  test("$json without property access - no violation", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "Test Node",
        type: "n8n-nodes-base.set",
        typeVersion: 1,
        position: [0, 0],
        parameters: { value: "The variable $json is used here" },
      },
    ]);
    expect(implicitJsonRefRule.check(wf, "").length).toBe(0);
  });

  test("array parameter with $json reference", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "Test Node",
        type: "n8n-nodes-base.set",
        typeVersion: 1,
        position: [0, 0],
        parameters: {
          items: ["={{ $json.item1 }}", "={{ $json.item2 }}"],
        },
      },
    ]);
    const violations = implicitJsonRefRule.check(wf, "");
    expect(violations.length).toBe(2);
    expect(violations.some((v) => v.message.includes("items[0]"))).toBe(true);
    expect(violations.some((v) => v.message.includes("items[1]"))).toBe(true);
  });
});
