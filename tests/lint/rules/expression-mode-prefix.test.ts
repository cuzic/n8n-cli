import { describe, expect, test } from "bun:test";
import type { Workflow } from "@/api/types.ts";
import { expressionModePrefixRule } from "@/lint/rules/expression-mode-prefix.ts";

function makeWorkflow(nodes: Workflow["nodes"]): Workflow {
  return { name: "Test", active: false, nodes, connections: {} };
}

describe("expression-mode-prefix rule", () => {
  test("name is expression-mode-prefix", () => {
    expect(expressionModePrefixRule.name).toBe("expression-mode-prefix");
  });

  test("default severity is warning", () => {
    expect(expressionModePrefixRule.defaultSeverity).toBe("warning");
  });

  test("null workflow returns no violations", () => {
    expect(expressionModePrefixRule.check(null, "").length).toBe(0);
  });

  test("expression with = prefix - no violation", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "Set",
        type: "n8n-nodes-base.set",
        typeVersion: 1,
        position: [0, 0],
        parameters: { value: "={{ $json.field }}" },
      },
    ]);
    expect(expressionModePrefixRule.check(wf, "").length).toBe(0);
  });

  test("expression without = prefix - violation", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "Set",
        type: "n8n-nodes-base.set",
        typeVersion: 1,
        position: [0, 0],
        parameters: { value: "{{ $json.field }}" },
      },
    ]);
    const violations = expressionModePrefixRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("Set");
    expect(violations[0]!.message).toContain("value");
    expect(violations[0]!.message).toContain("missing the '=' prefix");
  });

  test("text with expression but no = prefix - violation", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "HTTP Request",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 1,
        position: [0, 0],
        parameters: { url: "Hello {{ $json.name }}" },
      },
    ]);
    const violations = expressionModePrefixRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("HTTP Request");
    expect(violations[0]!.message).toContain("url");
  });

  test("plain text without expressions - no violation", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "Set",
        type: "n8n-nodes-base.set",
        typeVersion: 1,
        position: [0, 0],
        parameters: { value: "plain text value" },
      },
    ]);
    expect(expressionModePrefixRule.check(wf, "").length).toBe(0);
  });

  test("jsCode parameter is excluded", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "Code",
        type: "n8n-nodes-base.code",
        typeVersion: 1,
        position: [0, 0],
        parameters: { jsCode: "const x = {{ $json.field }};" },
      },
    ]);
    expect(expressionModePrefixRule.check(wf, "").length).toBe(0);
  });

  test("inputSchema parameter is excluded", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "Parser",
        type: "@n8n/n8n-nodes-langchain.outputParserStructured",
        typeVersion: 1,
        position: [0, 0],
        parameters: { inputSchema: "{{ $json.schema }}" },
      },
    ]);
    expect(expressionModePrefixRule.check(wf, "").length).toBe(0);
  });

  test("sticky note is excluded", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "Note",
        type: "n8n-nodes-base.stickyNote",
        typeVersion: 1,
        position: [0, 0],
        parameters: { content: "{{ $json.field }}" },
      },
    ]);
    expect(expressionModePrefixRule.check(wf, "").length).toBe(0);
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
            values: [{ name: "email", value: "{{ $json.email }}" }],
          },
        },
      },
    ]);
    const violations = expressionModePrefixRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("Execute Workflow");
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
          url: "{{ $json.url }}",
          body: "{{ $json.body }}",
        },
      },
    ]);
    expect(expressionModePrefixRule.check(wf, "").length).toBe(2);
  });
});
