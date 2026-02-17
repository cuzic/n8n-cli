import { describe, expect, test } from "bun:test";
import type { Workflow } from "@/api/types.ts";
import { aiAgentOutputRefRule } from "@/lint/rules/ai-agent-output-ref.ts";

describe("ai-agent-output-ref rule", () => {
  test("name is ai-agent-output-ref", () => {
    expect(aiAgentOutputRefRule.name).toBe("ai-agent-output-ref");
  });

  test("default severity is warning", () => {
    expect(aiAgentOutputRefRule.defaultSeverity).toBe("warning");
  });

  test("null workflow returns no violations", () => {
    expect(aiAgentOutputRefRule.check(null, "").length).toBe(0);
  });

  test("no AI Agent nodes - no violations", () => {
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
        { id: "2", name: "Code", type: "n8n-nodes-base.code", typeVersion: 1, position: [200, 0] },
      ],
      connections: {
        Trigger: { main: [[{ node: "Code", type: "main", index: 0 }]] },
      },
    };
    expect(aiAgentOutputRefRule.check(wf, "").length).toBe(0);
  });

  test("correct .json.output reference - no violation", () => {
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
        {
          id: "2",
          name: "AI Agent",
          type: "@n8n/n8n-nodes-langchain.agent",
          typeVersion: 3,
          position: [200, 0],
        },
        {
          id: "3",
          name: "Set",
          type: "n8n-nodes-base.set",
          typeVersion: 1,
          position: [400, 0],
          parameters: { value: "={{ $('AI Agent').item.json.output }}" },
        },
      ],
      connections: {
        Trigger: { main: [[{ node: "AI Agent", type: "main", index: 0 }]] },
        "AI Agent": { main: [[{ node: "Set", type: "main", index: 0 }]] },
      },
    };
    expect(aiAgentOutputRefRule.check(wf, "").length).toBe(0);
  });

  test("explicit incorrect .json.text reference - violation", () => {
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
        {
          id: "2",
          name: "AI Agent",
          type: "@n8n/n8n-nodes-langchain.agent",
          typeVersion: 3,
          position: [200, 0],
        },
        {
          id: "3",
          name: "Set",
          type: "n8n-nodes-base.set",
          typeVersion: 1,
          position: [400, 0],
          parameters: { value: "={{ $('AI Agent').item.json.text }}" },
        },
      ],
      connections: {
        Trigger: { main: [[{ node: "AI Agent", type: "main", index: 0 }]] },
        "AI Agent": { main: [[{ node: "Set", type: "main", index: 0 }]] },
      },
    };
    const violations = aiAgentOutputRefRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("AI Agent");
    expect(violations[0]!.message).toContain(".json.text");
    expect(violations[0]!.message).toContain(".json.output");
  });

  test("explicit incorrect .json.response reference - violation", () => {
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
        {
          id: "2",
          name: "AI Agent",
          type: "@n8n/n8n-nodes-langchain.agent",
          typeVersion: 3,
          position: [200, 0],
        },
        {
          id: "3",
          name: "Set",
          type: "n8n-nodes-base.set",
          typeVersion: 1,
          position: [400, 0],
          parameters: { value: "={{ $('AI Agent').item.json.response }}" },
        },
      ],
      connections: {
        Trigger: { main: [[{ node: "AI Agent", type: "main", index: 0 }]] },
        "AI Agent": { main: [[{ node: "Set", type: "main", index: 0 }]] },
      },
    };
    const violations = aiAgentOutputRefRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain(".json.response");
  });

  test("implicit $json.text in downstream node - violation", () => {
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
        {
          id: "2",
          name: "AI Agent",
          type: "@n8n/n8n-nodes-langchain.agent",
          typeVersion: 3,
          position: [200, 0],
        },
        {
          id: "3",
          name: "Set",
          type: "n8n-nodes-base.set",
          typeVersion: 1,
          position: [400, 0],
          parameters: { value: "={{ $json.text }}" },
        },
      ],
      connections: {
        Trigger: { main: [[{ node: "AI Agent", type: "main", index: 0 }]] },
        "AI Agent": { main: [[{ node: "Set", type: "main", index: 0 }]] },
      },
    };
    const violations = aiAgentOutputRefRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("$json.text");
    expect(violations[0]!.message).toContain("downstream");
  });

  test("implicit $json.text in non-downstream node - no violation", () => {
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
        {
          id: "2",
          name: "AI Agent",
          type: "@n8n/n8n-nodes-langchain.agent",
          typeVersion: 3,
          position: [200, 0],
        },
        {
          id: "3",
          name: "Set",
          type: "n8n-nodes-base.set",
          typeVersion: 1,
          position: [400, 0],
          parameters: { value: "={{ $json.text }}" },
        },
      ],
      connections: {
        Trigger: { main: [[{ node: "AI Agent", type: "main", index: 0 }]] },
      },
    };
    // Set is not directly downstream of AI Agent
    expect(aiAgentOutputRefRule.check(wf, "").length).toBe(0);
  });

  test("explicit .first().json.message reference - violation", () => {
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
        {
          id: "2",
          name: "AI Agent",
          type: "@n8n/n8n-nodes-langchain.agent",
          typeVersion: 3,
          position: [200, 0],
        },
        {
          id: "3",
          name: "Code",
          type: "n8n-nodes-base.code",
          typeVersion: 1,
          position: [400, 0],
          parameters: { jsCode: "return $('AI Agent').first().json.message" },
        },
      ],
      connections: {
        Trigger: { main: [[{ node: "AI Agent", type: "main", index: 0 }]] },
        "AI Agent": { main: [[{ node: "Code", type: "main", index: 0 }]] },
      },
    };
    const violations = aiAgentOutputRefRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain(".json.message");
  });

  test("multiple incorrect field references", () => {
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
        {
          id: "2",
          name: "AI Agent",
          type: "@n8n/n8n-nodes-langchain.agent",
          typeVersion: 3,
          position: [200, 0],
        },
        {
          id: "3",
          name: "Set",
          type: "n8n-nodes-base.set",
          typeVersion: 1,
          position: [400, 0],
          parameters: {
            value1: "={{ $('AI Agent').item.json.text }}",
            value2: "={{ $('AI Agent').item.json.result }}",
          },
        },
      ],
      connections: {
        Trigger: { main: [[{ node: "AI Agent", type: "main", index: 0 }]] },
        "AI Agent": { main: [[{ node: "Set", type: "main", index: 0 }]] },
      },
    };
    expect(aiAgentOutputRefRule.check(wf, "").length).toBe(2);
  });
});
