import { describe, expect, test } from "bun:test";
import type { Workflow } from "@/api/types.ts";
import { isTriggerNode, orphanedNodeRule } from "@/lint/rules/orphaned-node.ts";

describe("orphaned-node rule", () => {
  test("name is orphaned-node", () => {
    expect(orphanedNodeRule.name).toBe("orphaned-node");
  });

  test("null workflow returns no violations", () => {
    expect(orphanedNodeRule.check(null, "").length).toBe(0);
  });

  test("connected workflow - no violations", () => {
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
    expect(orphanedNodeRule.check(wf, "").length).toBe(0);
  });

  test("orphaned node", () => {
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
        {
          id: "3",
          name: "Orphan",
          type: "n8n-nodes-base.code",
          typeVersion: 1,
          position: [400, 0],
        },
      ],
      connections: {
        Trigger: { main: [[{ node: "NodeA", type: "main", index: 0 }]] },
      },
    };
    const violations = orphanedNodeRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toBe('Node "Orphan" is not connected to any other nodes');
  });

  test("sticky note is allowed to be orphaned", () => {
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
        {
          id: "3",
          name: "Note",
          type: "n8n-nodes-base.stickyNote",
          typeVersion: 1,
          position: [0, 200],
        },
      ],
      connections: {
        Trigger: { main: [[{ node: "NodeA", type: "main", index: 0 }]] },
      },
    };
    expect(orphanedNodeRule.check(wf, "").length).toBe(0);
  });

  test("trigger without outgoing connection", () => {
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
      connections: {},
    };
    const violations = orphanedNodeRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toBe('Trigger node "Trigger" has no outgoing connections');
  });

  test("AI connected node is not orphaned", () => {
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
          name: "Agent",
          type: "@n8n/n8n-nodes-langchain.agent",
          typeVersion: 1,
          position: [200, 0],
        },
        {
          id: "3",
          name: "LLM",
          type: "@n8n/n8n-nodes-langchain.lmChatGoogleVertex",
          typeVersion: 1,
          position: [200, 200],
        },
      ],
      connections: {
        Trigger: { main: [[{ node: "Agent", type: "main", index: 0 }]] },
        LLM: {
          ai_languageModel: [[{ node: "Agent", type: "ai_languageModel", index: 0 }]],
        },
      },
    };
    expect(orphanedNodeRule.check(wf, "").length).toBe(0);
  });

  test("AI node without connection is orphaned", () => {
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
          name: "Agent",
          type: "@n8n/n8n-nodes-langchain.agent",
          typeVersion: 1,
          position: [200, 0],
        },
        {
          id: "3",
          name: "LLM",
          type: "@n8n/n8n-nodes-langchain.lmChatGoogleVertex",
          typeVersion: 1,
          position: [200, 200],
        },
      ],
      connections: {
        Trigger: { main: [[{ node: "Agent", type: "main", index: 0 }]] },
      },
    };
    const violations = orphanedNodeRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toBe('Node "LLM" is not connected to any other nodes');
  });

  test("multiple AI connection types", () => {
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
          name: "Agent",
          type: "@n8n/n8n-nodes-langchain.agent",
          typeVersion: 1,
          position: [200, 0],
        },
        {
          id: "3",
          name: "LLM",
          type: "@n8n/n8n-nodes-langchain.lmChatGoogleVertex",
          typeVersion: 1,
          position: [200, 200],
        },
        {
          id: "4",
          name: "Parser",
          type: "@n8n/n8n-nodes-langchain.outputParserStructured",
          typeVersion: 1,
          position: [200, 400],
        },
      ],
      connections: {
        Trigger: { main: [[{ node: "Agent", type: "main", index: 0 }]] },
        LLM: {
          ai_languageModel: [[{ node: "Agent", type: "ai_languageModel", index: 0 }]],
        },
        Parser: {
          ai_outputParser: [[{ node: "Agent", type: "ai_outputParser", index: 0 }]],
        },
      },
    };
    expect(orphanedNodeRule.check(wf, "").length).toBe(0);
  });
});

describe("isTriggerNode", () => {
  const cases = [
    { nodeType: "n8n-nodes-base.manualTrigger", want: true },
    { nodeType: "n8n-nodes-base.executeWorkflowTrigger", want: true },
    { nodeType: "n8n-nodes-base.scheduleTrigger", want: true },
    { nodeType: "n8n-nodes-base.webhookTrigger", want: true },
    { nodeType: "n8n-nodes-base.code", want: false },
    { nodeType: "n8n-nodes-base.httpRequest", want: false },
    { nodeType: "@n8n/n8n-nodes-langchain.agent", want: false },
  ];

  for (const tc of cases) {
    test(`${tc.nodeType} => ${tc.want}`, () => {
      expect(isTriggerNode(tc.nodeType)).toBe(tc.want);
    });
  }
});
