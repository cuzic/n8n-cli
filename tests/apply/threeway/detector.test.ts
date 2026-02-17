import { describe, expect, test } from "bun:test";
import type { Node, Workflow } from "../../../src/api/types.ts";
import { ThreeWayDetector } from "../../../src/apply/threeway/detector.ts";
import type { ConflictType } from "../../../src/apply/threeway/types.ts";

describe("ThreeWayDetector.detect", () => {
  const detector = new ThreeWayDetector();

  const cases: {
    name: string;
    base: Workflow | null;
    local: Workflow;
    remote: Workflow | null;
    expectedType: ConflictType;
    expectedReason: string;
  }[] = [
    {
      name: "nil base - new workflow",
      base: null,
      local: { id: "123", name: "test", active: false, nodes: [], connections: {} },
      remote: { id: "123", name: "test", active: false, nodes: [], connections: {} },
      expectedType: "create",
      expectedReason: "new workflow (not found at base ref)",
    },
    {
      name: "nil remote - workflow not on server",
      base: { id: "123", name: "test", active: false, nodes: [], connections: {} },
      local: { id: "123", name: "test", active: false, nodes: [], connections: {} },
      remote: null,
      expectedType: "create",
      expectedReason: "workflow does not exist on remote server",
    },
    {
      name: "no changes from base",
      base: { id: "123", name: "test", active: false, nodes: [], connections: {} },
      local: { id: "123", name: "test", active: false, nodes: [], connections: {} },
      remote: { id: "123", name: "test", active: false, nodes: [], connections: {} },
      expectedType: "skip",
      expectedReason: "no changes from base",
    },
    {
      name: "only local changed",
      base: { id: "123", name: "test", active: false, nodes: [], connections: {} },
      local: { id: "123", name: "test-modified", active: false, nodes: [], connections: {} },
      remote: { id: "123", name: "test", active: false, nodes: [], connections: {} },
      expectedType: "update",
      expectedReason: "only local changed from base",
    },
    {
      name: "only remote changed",
      base: { id: "123", name: "test", active: false, nodes: [], connections: {} },
      local: { id: "123", name: "test", active: false, nodes: [], connections: {} },
      remote: { id: "123", name: "test-modified", active: false, nodes: [], connections: {} },
      expectedType: "skip",
      expectedReason: "only remote changed, no local changes to apply",
    },
    {
      name: "converged - same changes",
      base: { id: "123", name: "test", active: false, nodes: [], connections: {} },
      local: { id: "123", name: "test-modified", active: true, nodes: [], connections: {} },
      remote: { id: "123", name: "test-modified", active: true, nodes: [], connections: {} },
      expectedType: "update",
      expectedReason: "converged (local and remote have same content)",
    },
    {
      name: "divergent - true conflict",
      base: { id: "123", name: "test", active: false, nodes: [], connections: {} },
      local: { id: "123", name: "test-local", active: false, nodes: [], connections: {} },
      remote: { id: "123", name: "test-remote", active: false, nodes: [], connections: {} },
      expectedType: "conflict",
      expectedReason: "divergent changes (both local and remote changed differently from base)",
    },
  ];

  for (const tc of cases) {
    test(tc.name, () => {
      const result = detector.detect(tc.base, tc.local, tc.remote);
      expect(result.type).toBe(tc.expectedType);
      expect(result.reason).toBe(tc.expectedReason);
    });
  }
});

describe("ThreeWayDetector.detect with nodes", () => {
  const detector = new ThreeWayDetector();

  test("only local added nodes - should update", () => {
    const baseNodes: Node[] = [
      {
        id: "node1",
        name: "Node 1",
        type: "n8n-nodes-base.code",
        typeVersion: 1,
        position: [0, 0],
      },
    ];
    const localNodes: Node[] = [
      {
        id: "node1",
        name: "Node 1",
        type: "n8n-nodes-base.code",
        typeVersion: 1,
        position: [0, 0],
      },
      {
        id: "node2",
        name: "Node 2",
        type: "n8n-nodes-base.http",
        typeVersion: 1,
        position: [200, 0],
      },
    ];
    const remoteNodes: Node[] = [
      {
        id: "node1",
        name: "Node 1",
        type: "n8n-nodes-base.code",
        typeVersion: 1,
        position: [0, 0],
      },
    ];

    const base: Workflow = {
      id: "123",
      name: "test",
      active: false,
      nodes: baseNodes,
      connections: {},
    };
    const local: Workflow = {
      id: "123",
      name: "test",
      active: false,
      nodes: localNodes,
      connections: {},
    };
    const remote: Workflow = {
      id: "123",
      name: "test",
      active: false,
      nodes: remoteNodes,
      connections: {},
    };

    const result = detector.detect(base, local, remote);
    expect(result.type).toBe("update");
    expect(result.baseToLocal?.hasChanges).toBe(true);
    expect(result.baseToRemote?.hasChanges).toBe(false);
  });
});
