import { type FormatterNode, type FormatterWorkflow, isStickyNote } from "./workflow.ts";

/** Position represents a 2D coordinate */
export interface Position {
  x: number;
  y: number;
}

/** Edge represents a directed edge between two nodes */
export interface Edge {
  from: string;
  to: string;
}

/** GraphNode represents a node in the graph with layout information */
export interface GraphNode {
  name: string;
  original: FormatterNode;
  layer: number;
  position: Position;
}

/** Graph represents a workflow as a directed graph */
export interface Graph {
  nodes: Map<string, GraphNode>;
  edges: Edge[];
}

/** NewGraph creates a new empty graph */
export function newGraph(): Graph {
  return {
    nodes: new Map(),
    edges: [],
  };
}

/** BuildGraph constructs a graph from a workflow, excluding sticky notes */
export function buildGraph(workflow: FormatterWorkflow): Graph {
  const graph = newGraph();

  // Extract edges from connections
  for (const [sourceName, connData] of Object.entries(workflow.connections)) {
    // Skip if source is a sticky note
    const sourceNode = findNodeByName(workflow, sourceName);
    if (!sourceNode || isStickyNote(sourceNode)) {
      continue;
    }

    const connMap = connData as Record<string, unknown>;
    if (typeof connMap !== "object" || connMap === null) {
      continue;
    }

    // Only process main connections (ai_* are handled separately in layout)
    const connectionTypes = ["main"];

    for (const connType of connectionTypes) {
      const conns = connMap[connType];
      if (!conns || !Array.isArray(conns)) {
        continue;
      }

      for (const connGroup of conns) {
        if (!Array.isArray(connGroup)) {
          continue;
        }

        for (const conn of connGroup) {
          const connObj = conn as Record<string, unknown>;
          if (typeof connObj !== "object" || connObj === null) {
            continue;
          }

          const targetName = connObj.node;
          if (typeof targetName !== "string") {
            continue;
          }

          // Skip if target is a sticky note
          const targetNode = findNodeByName(workflow, targetName);
          if (!targetNode || isStickyNote(targetNode)) {
            continue;
          }

          graph.edges.push({ from: sourceName, to: targetName });
        }
      }
    }
  }

  // Add all nodes to graph (excluding sticky notes)
  for (const node of workflow.nodes) {
    if (isStickyNote(node)) {
      continue;
    }

    graph.nodes.set(node.name, {
      name: node.name,
      original: node,
      layer: 0,
      position: { x: 0, y: 0 },
    });
  }

  return graph;
}

/** findNodeByName finds a node by name in a workflow */
function findNodeByName(workflow: FormatterWorkflow, name: string): FormatterNode | undefined {
  return workflow.nodes.find((n) => n.name === name);
}
