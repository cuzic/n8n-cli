import type { Graph, GraphNode } from "./graph.ts";
import {
  ErrCyclicGraph,
  isLangChainAgentNode,
  isLangChainSubNode,
  NODE_X_SPACING,
  NODE_Y_SPACING,
} from "./workflow.ts";

/** TopologicalSort assigns layer numbers to nodes based on dependencies (BFS / Kahn's algorithm) */
export function topologicalSort(graph: Graph): void {
  // Calculate in-degree for each node
  const inDegree = new Map<string, number>();
  for (const name of graph.nodes.keys()) {
    inDegree.set(name, 0);
  }
  for (const edge of graph.edges) {
    inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
  }

  // Queue for nodes with in-degree 0
  const queue: string[] = [];
  for (const [name, degree] of inDegree) {
    if (degree === 0) {
      queue.push(name);
      const node = graph.nodes.get(name);
      if (node) node.layer = 0;
    }
  }

  // Process nodes in topological order
  let processed = 0;
  while (queue.length > 0) {
    const current = queue.shift()!;
    processed++;

    const currentNode = graph.nodes.get(current);
    const currentLayer = currentNode?.layer ?? 0;

    for (const edge of graph.edges) {
      if (edge.from !== current) continue;

      const target = edge.to;
      const newDegree = (inDegree.get(target) ?? 0) - 1;
      inDegree.set(target, newDegree);

      const targetNode = graph.nodes.get(target);
      if (targetNode && targetNode.layer <= currentLayer) {
        targetNode.layer = currentLayer + 1;
      }

      if (newDegree === 0) {
        queue.push(target);
      }
    }
  }

  // Check for cycles
  if (processed !== graph.nodes.size) {
    throw ErrCyclicGraph;
  }
}

/** CalculateLayout calculates X and Y positions for all nodes based on their layers */
export function calculateLayout(graph: Graph): void {
  // Build parent-child relationships
  const parents = new Map<string, string[]>();
  const children = new Map<string, string[]>();
  for (const edge of graph.edges) {
    if (!parents.has(edge.to)) parents.set(edge.to, []);
    parents.get(edge.to)?.push(edge.from);

    if (!children.has(edge.from)) children.set(edge.from, []);
    children.get(edge.from)?.push(edge.to);
  }

  // Group nodes by layer
  const layers = new Map<number, GraphNode[]>();
  let maxLayer = 0;
  for (const node of graph.nodes.values()) {
    if (!layers.has(node.layer)) layers.set(node.layer, []);
    layers.get(node.layer)?.push(node);
    if (node.layer > maxLayer) maxLayer = node.layer;
  }

  // Ensure deterministic ordering within each layer (sort by node name)
  for (const nodes of layers.values()) {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
  }

  // Separate LangChain sub-nodes from Layer 0
  const langchainSubNodes: GraphNode[] = [];
  const layer0 = layers.get(0);
  if (layer0 && layer0.length > 0) {
    const connectedNodes: GraphNode[] = [];
    for (const node of layer0) {
      const isSubNode = isLangChainSubNode(node.original);
      const hasNoParents = !parents.has(node.name) || parents.get(node.name)?.length === 0;
      const hasNoChildren = !children.has(node.name) || children.get(node.name)?.length === 0;

      if (hasNoParents && hasNoChildren && isSubNode) {
        langchainSubNodes.push(node);
      } else {
        connectedNodes.push(node);
      }
    }
    layers.set(0, connectedNodes);
  }

  // Process each layer from left to right
  for (let layer = 0; layer <= maxLayer; layer++) {
    const nodesInLayer = layers.get(layer);
    if (!nodesInLayer || nodesInLayer.length === 0) continue;

    const x = layer * NODE_X_SPACING;

    for (const node of nodesInLayer) {
      let y: number;
      const parentNames = parents.get(node.name);

      if (parentNames && parentNames.length > 0) {
        // Calculate median Y position of parent nodes
        const parentYPositions: number[] = [];
        for (const parentName of parentNames) {
          const parentNode = graph.nodes.get(parentName);
          if (parentNode) {
            parentYPositions.push(parentNode.position.y);
          }
        }
        y = parentYPositions.length > 0 ? median(parentYPositions) : 0;
      } else {
        // Root node: position based on index
        const idx = nodesInLayer.indexOf(node);
        y = idx * NODE_Y_SPACING;
      }

      node.position.x = x;
      node.position.y = y;
    }

    resolveCollisions(nodesInLayer);
  }

  // Position LangChain sub-nodes under their parent agent nodes
  const agentSubNodes = new Map<GraphNode, GraphNode[]>();

  for (const subNode of langchainSubNodes) {
    let nearestAgent: GraphNode | null = null;
    let minDistance = 1e10;

    for (const node of graph.nodes.values()) {
      if (isLangChainAgentNode(node.original)) {
        const dx = subNode.original.position[0] - node.original.position[0];
        const dy = subNode.original.position[1] - node.original.position[1];
        const distance = dx * dx + dy * dy;

        if (distance < minDistance) {
          minDistance = distance;
          nearestAgent = node;
        }
      }
    }

    if (nearestAgent) {
      if (!agentSubNodes.has(nearestAgent)) agentSubNodes.set(nearestAgent, []);
      agentSubNodes.get(nearestAgent)?.push(subNode);
    }
  }

  const SUB_NODE_SPACING = 120.0;
  for (const [agent, subNodes] of agentSubNodes) {
    const totalHeight = (subNodes.length - 1) * SUB_NODE_SPACING;
    const startY = agent.position.y + NODE_Y_SPACING - totalHeight / 2;

    for (let i = 0; i < subNodes.length; i++) {
      subNodes[i]!.position.x = agent.position.x;
      subNodes[i]!.position.y = startY + i * SUB_NODE_SPACING;
    }
  }
}

/** median calculates the median of a slice of numbers */
function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
}

/** resolveCollisions adjusts Y positions to prevent nodes from overlapping */
function resolveCollisions(nodesInLayer: GraphNode[]): void {
  if (nodesInLayer.length <= 1) return;

  const sorted = [...nodesInLayer].sort((a, b) => a.position.y - b.position.y);

  // Adjust positions to maintain minimum spacing
  for (let i = 1; i < sorted.length; i++) {
    const minY = sorted[i - 1]!.position.y + NODE_Y_SPACING;
    if (sorted[i]!.position.y < minY) {
      sorted[i]!.position.y = minY;
    }
  }

  // Center the layer vertically
  if (sorted.length > 0) {
    const minY = sorted[0]!.position.y;
    const maxY = sorted[sorted.length - 1]!.position.y;
    const offset = -(minY + maxY) / 2;
    for (const node of sorted) {
      node.position.y += offset;
    }
  }
}
