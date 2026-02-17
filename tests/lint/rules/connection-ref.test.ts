import { describe, expect, test } from "bun:test";
import type { Workflow } from "@/api/types.ts";
import { connectionRefRule } from "@/lint/rules/connection-ref.ts";

describe("connection-reference rule", () => {
  test("name is connection-reference", () => {
    expect(connectionRefRule.name).toBe("connection-reference");
  });

  test("null workflow returns no violations", () => {
    expect(connectionRefRule.check(null, "").length).toBe(0);
  });

  test("valid connections - no violations", () => {
    const wf: Workflow = {
      name: "Test",
      active: false,
      nodes: [
        {
          id: "1",
          name: "Trigger",
          type: "n8n-nodes-base.manualTrigger",
          typeVersion: 1,
          position: [0, 0],
        },
        { id: "2", name: "NodeA", type: "n8n-nodes-base.code", typeVersion: 1, position: [200, 0] },
      ],
      connections: {
        Trigger: { main: [[{ node: "NodeA", type: "main", index: 0 }]] },
      },
    };
    expect(connectionRefRule.check(wf, "").length).toBe(0);
  });

  test("missing source node", () => {
    const wf: Workflow = {
      name: "Test",
      active: false,
      nodes: [
        { id: "1", name: "NodeA", type: "n8n-nodes-base.code", typeVersion: 1, position: [0, 0] },
      ],
      connections: {
        NonExistent: { main: [[{ node: "NodeA", type: "main", index: 0 }]] },
      },
    };
    const violations = connectionRefRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("NonExistent");
  });

  test("missing target node", () => {
    const wf: Workflow = {
      name: "Test",
      active: false,
      nodes: [
        {
          id: "1",
          name: "Trigger",
          type: "n8n-nodes-base.manualTrigger",
          typeVersion: 1,
          position: [0, 0],
        },
      ],
      connections: {
        Trigger: {
          main: [[{ node: "NonExistent", type: "main", index: 0 }]],
        },
      },
    };
    const violations = connectionRefRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("NonExistent");
  });

  test("AI connection target references are checked", () => {
    const wf: Workflow = {
      name: "Test",
      active: false,
      nodes: [
        {
          id: "1",
          name: "Agent",
          type: "@n8n/n8n-nodes-langchain.agent",
          typeVersion: 1,
          position: [0, 0],
        },
      ],
      connections: {
        LLM: {
          ai_languageModel: [[{ node: "Agent", type: "ai_languageModel", index: 0 }]],
        },
      },
    };
    const violations = connectionRefRule.check(wf, "");
    // Source "LLM" doesn't exist
    expect(violations.some((v) => v.message.includes("LLM"))).toBe(true);
  });
});
