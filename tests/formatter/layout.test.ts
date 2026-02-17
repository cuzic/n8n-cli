import { describe, expect, it } from "bun:test";
import { type GraphNode, newGraph } from "../../src/formatter/graph.ts";
import { calculateLayout, topologicalSort } from "../../src/formatter/layout.ts";
import type { FormatterNode } from "../../src/formatter/workflow.ts";
import { ErrCyclicGraph, NODE_X_SPACING, NODE_Y_SPACING } from "../../src/formatter/workflow.ts";

function makeNode(name: string): FormatterNode {
  return {
    id: name,
    name,
    type: "n8n-nodes-base.noOp",
    typeVersion: 1,
    position: [0, 0],
    parameters: {},
  };
}

function makeGraphNode(name: string, layer = 0): GraphNode {
  return {
    name,
    original: makeNode(name),
    layer,
    position: { x: 0, y: 0 },
  };
}

describe("topologicalSort", () => {
  it("assigns layers to linear graph A -> B -> C", () => {
    const graph = newGraph();
    graph.nodes.set("A", makeGraphNode("A"));
    graph.nodes.set("B", makeGraphNode("B"));
    graph.nodes.set("C", makeGraphNode("C"));
    graph.edges = [
      { from: "A", to: "B" },
      { from: "B", to: "C" },
    ];

    topologicalSort(graph);

    expect(graph.nodes.get("A")!.layer).toBe(0);
    expect(graph.nodes.get("B")!.layer).toBe(1);
    expect(graph.nodes.get("C")!.layer).toBe(2);
  });

  it("detects cyclic graph", () => {
    const graph = newGraph();
    graph.nodes.set("A", makeGraphNode("A"));
    graph.nodes.set("B", makeGraphNode("B"));
    graph.nodes.set("C", makeGraphNode("C"));
    graph.edges = [
      { from: "A", to: "B" },
      { from: "B", to: "C" },
      { from: "C", to: "A" },
    ];

    expect(() => topologicalSort(graph)).toThrow(ErrCyclicGraph);
  });

  it("handles branching graph", () => {
    const graph = newGraph();
    graph.nodes.set("A", makeGraphNode("A"));
    graph.nodes.set("B", makeGraphNode("B"));
    graph.nodes.set("C", makeGraphNode("C"));
    graph.nodes.set("D", makeGraphNode("D"));
    graph.edges = [
      { from: "A", to: "B" },
      { from: "A", to: "C" },
      { from: "B", to: "D" },
      { from: "C", to: "D" },
    ];

    topologicalSort(graph);

    expect(graph.nodes.get("A")!.layer).toBe(0);
    expect(graph.nodes.get("B")!.layer).toBe(1);
    expect(graph.nodes.get("C")!.layer).toBe(1);
    expect(graph.nodes.get("D")!.layer).toBe(2);
  });
});

describe("calculateLayout", () => {
  it("assigns X positions based on layers", () => {
    const graph = newGraph();
    graph.nodes.set("A", makeGraphNode("A", 0));
    graph.nodes.set("B", makeGraphNode("B", 1));
    graph.nodes.set("C", makeGraphNode("C", 2));

    calculateLayout(graph);

    expect(graph.nodes.get("A")!.position.x).toBe(0);
    expect(graph.nodes.get("B")!.position.x).toBe(NODE_X_SPACING);
    expect(graph.nodes.get("C")!.position.x).toBe(2 * NODE_X_SPACING);
  });

  it("spaces multiple nodes in same layer vertically", () => {
    const graph = newGraph();
    graph.nodes.set("A", makeGraphNode("A", 0));
    graph.nodes.set("B", makeGraphNode("B", 1));
    graph.nodes.set("C", makeGraphNode("C", 1));

    calculateLayout(graph);

    // B and C should have same X but different Y
    expect(graph.nodes.get("B")!.position.x).toBe(graph.nodes.get("C")!.position.x);

    const yDiff = Math.abs(graph.nodes.get("C")!.position.y - graph.nodes.get("B")!.position.y);
    expect(yDiff).toBe(NODE_Y_SPACING);
  });
});
