import { describe, expect, it } from "bun:test";
import { buildGraph, newGraph } from "../../src/formatter/graph.ts";
import type { FormatterWorkflow } from "../../src/formatter/workflow.ts";

describe("newGraph", () => {
  it("creates an empty graph", () => {
    const graph = newGraph();
    expect(graph.nodes.size).toBe(0);
    expect(graph.edges).toEqual([]);
  });
});

describe("buildGraph", () => {
  it("builds graph from simple workflow", () => {
    const workflow: FormatterWorkflow = {
      name: "Test",
      active: false,
      nodes: [
        {
          id: "1",
          name: "Start",
          type: "n8n-nodes-base.manualTrigger",
          typeVersion: 1,
          position: [0, 0],
          parameters: {},
        },
        {
          id: "2",
          name: "HTTP Request",
          type: "n8n-nodes-base.httpRequest",
          typeVersion: 1,
          position: [200, 0],
          parameters: {},
        },
        {
          id: "3",
          name: "End",
          type: "n8n-nodes-base.noOp",
          typeVersion: 1,
          position: [400, 0],
          parameters: {},
        },
      ],
      connections: {
        Start: {
          main: [[{ node: "HTTP Request", type: "main", index: 0 }]],
        },
        "HTTP Request": {
          main: [[{ node: "End", type: "main", index: 0 }]],
        },
      },
    };

    const graph = buildGraph(workflow);

    // Should have 3 nodes
    expect(graph.nodes.size).toBe(3);
    expect(graph.nodes.has("Start")).toBe(true);
    expect(graph.nodes.has("HTTP Request")).toBe(true);
    expect(graph.nodes.has("End")).toBe(true);

    // Should have 2 edges
    expect(graph.edges.length).toBe(2);

    const edgeMap = new Map(graph.edges.map((e) => [e.from, e.to]));
    expect(edgeMap.get("Start")).toBe("HTTP Request");
    expect(edgeMap.get("HTTP Request")).toBe("End");
  });

  it("excludes sticky notes from graph", () => {
    const workflow: FormatterWorkflow = {
      name: "Test",
      active: false,
      nodes: [
        {
          id: "1",
          name: "Start",
          type: "n8n-nodes-base.manualTrigger",
          typeVersion: 1,
          position: [0, 0],
          parameters: {},
        },
        {
          id: "2",
          name: "End",
          type: "n8n-nodes-base.noOp",
          typeVersion: 1,
          position: [200, 0],
          parameters: {},
        },
        {
          id: "3",
          name: "Note",
          type: "n8n-nodes-base.stickyNote",
          typeVersion: 1,
          position: [100, 200],
          parameters: {},
        },
      ],
      connections: {
        Start: {
          main: [[{ node: "End", type: "main", index: 0 }]],
        },
      },
    };

    const graph = buildGraph(workflow);

    // Sticky note should be excluded
    expect(graph.nodes.size).toBe(2);
    expect(graph.nodes.has("Note")).toBe(false);
  });
});
