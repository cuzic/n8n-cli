import { describe, expect, test } from "bun:test";
import type { Workflow } from "@/api/types.ts";
import {
  buildAdjacencyList,
  hasCardinalityReducerOnPath,
  nodeRefCardinalityRule,
} from "@/lint/rules/node-ref-cardinality.ts";

describe("node-ref-cardinality rule", () => {
  test("name is node-ref-cardinality", () => {
    expect(nodeRefCardinalityRule.name).toBe("node-ref-cardinality");
  });

  test("default severity is warning", () => {
    expect(nodeRefCardinalityRule.defaultSeverity).toBe("warning");
  });

  test("null workflow returns no violations", () => {
    expect(nodeRefCardinalityRule.check(null, "").length).toBe(0);
  });

  test("1:1 node with .item - no violation", () => {
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
    expect(nodeRefCardinalityRule.check(wf, "").length).toBe(0);
  });

  test("N:1 node with .item - violation", () => {
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
          name: "Aggregate",
          type: "n8n-nodes-base.aggregate",
          typeVersion: 1,
          position: [200, 0],
          parameters: { destinationFieldName: "data" },
        },
        {
          id: "3",
          name: "Set",
          type: "n8n-nodes-base.set",
          typeVersion: 1,
          position: [400, 0],
          parameters: { value: "={{ $('Aggregate').item.json.data }}" },
        },
      ],
      connections: {
        Trigger: { main: [[{ node: "Aggregate", type: "main", index: 0 }]] },
        Aggregate: { main: [[{ node: "Set", type: "main", index: 0 }]] },
      },
    };
    const violations = nodeRefCardinalityRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("Aggregate");
    expect(violations[0]!.message).toContain("N:1");
    expect(violations[0]!.message).toContain(".first()");
  });

  test("N:1 node with .first() - no violation", () => {
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
          name: "Aggregate",
          type: "n8n-nodes-base.aggregate",
          typeVersion: 1,
          position: [200, 0],
          parameters: { destinationFieldName: "data" },
        },
        {
          id: "3",
          name: "Set",
          type: "n8n-nodes-base.set",
          typeVersion: 1,
          position: [400, 0],
          parameters: { value: "={{ $('Aggregate').first().json.data }}" },
        },
      ],
      connections: {
        Trigger: { main: [[{ node: "Aggregate", type: "main", index: 0 }]] },
        Aggregate: { main: [[{ node: "Set", type: "main", index: 0 }]] },
      },
    };
    expect(nodeRefCardinalityRule.check(wf, "").length).toBe(0);
  });

  test("1:N node with .item after reducer - violation", () => {
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
          name: "BigQuery",
          type: "n8n-nodes-base.googleBigQuery",
          typeVersion: 1,
          position: [200, 0],
        },
        {
          id: "3",
          name: "Aggregate",
          type: "n8n-nodes-base.aggregate",
          typeVersion: 1,
          position: [400, 0],
          parameters: { destinationFieldName: "data" },
        },
        {
          id: "4",
          name: "Set",
          type: "n8n-nodes-base.set",
          typeVersion: 1,
          position: [600, 0],
          parameters: { value: "={{ $('BigQuery').item.json.name }}" },
        },
      ],
      connections: {
        Trigger: { main: [[{ node: "BigQuery", type: "main", index: 0 }]] },
        BigQuery: { main: [[{ node: "Aggregate", type: "main", index: 0 }]] },
        Aggregate: { main: [[{ node: "Set", type: "main", index: 0 }]] },
      },
    };
    const violations = nodeRefCardinalityRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("BigQuery");
    expect(violations[0]!.message).toContain("cardinality-reducing");
  });

  test("sticky note is excluded", () => {
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
          name: "Note",
          type: "n8n-nodes-base.stickyNote",
          typeVersion: 1,
          position: [0, 200],
          parameters: { content: "={{ $('Trigger').item.json.data }}" },
        },
      ],
      connections: {},
    };
    expect(nodeRefCardinalityRule.check(wf, "").length).toBe(0);
  });
});

describe("buildAdjacencyList", () => {
  test("builds correct adjacency list", () => {
    const wf: Workflow = {
      name: "Test",
      active: false,
      nodes: [
        { id: "1", name: "A", type: "n8n-nodes-base.set", typeVersion: 1, position: [0, 0] },
        { id: "2", name: "B", type: "n8n-nodes-base.set", typeVersion: 1, position: [200, 0] },
        { id: "3", name: "C", type: "n8n-nodes-base.set", typeVersion: 1, position: [400, 0] },
      ],
      connections: {
        A: { main: [[{ node: "B", type: "main", index: 0 }]] },
        B: { main: [[{ node: "C", type: "main", index: 0 }]] },
      },
    };
    const adj = buildAdjacencyList(wf);
    expect(adj.get("A")).toEqual(["B"]);
    expect(adj.get("B")).toEqual(["C"]);
    expect(adj.has("C")).toBe(false);
  });
});

describe("hasCardinalityReducerOnPath", () => {
  test("returns true when reducer exists on path", () => {
    const adj = new Map<string, string[]>([
      ["A", ["B"]],
      ["B", ["C"]],
    ]);
    const isReducer = (name: string) => name === "B";
    expect(hasCardinalityReducerOnPath(adj, "A", "C", isReducer)).toBe(true);
  });

  test("returns false when no reducer on path", () => {
    const adj = new Map<string, string[]>([
      ["A", ["B"]],
      ["B", ["C"]],
    ]);
    const isReducer = () => false;
    expect(hasCardinalityReducerOnPath(adj, "A", "C", isReducer)).toBe(false);
  });

  test("returns false when no path exists", () => {
    const adj = new Map<string, string[]>([["A", ["B"]]]);
    const isReducer = () => true;
    expect(hasCardinalityReducerOnPath(adj, "A", "C", isReducer)).toBe(false);
  });
});
