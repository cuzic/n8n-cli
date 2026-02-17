import { describe, expect, test } from "bun:test";
import type { Node, NodeConn, PinDataItem, Workflow } from "../../src/api/types.ts";
import {
  compare,
  connectionsEqual,
  nodesEqual,
  normalizeValue,
  pinDataEqual,
} from "../../src/apply/differ.ts";

describe("normalizeValue", () => {
  test("nil returns nil", () => {
    expect(normalizeValue(null)).toBe(null);
  });

  test("empty map stays empty map", () => {
    expect(normalizeValue({})).toEqual({});
  });

  test("empty slice stays empty slice", () => {
    expect(normalizeValue([])).toEqual([]);
  });

  test("primitive string preserved", () => {
    expect(normalizeValue("test")).toBe("test");
  });

  test("primitive number preserved", () => {
    expect(normalizeValue(42.0)).toBe(42.0);
  });

  test("nested empty values removed", () => {
    expect(normalizeValue({ main: [] })).toEqual({});
  });

  test("deeply nested empty values removed", () => {
    expect(normalizeValue({ main: [[]] })).toEqual({});
  });

  test("non-empty values preserved", () => {
    expect(normalizeValue({ key: "value" })).toEqual({ key: "value" });
  });
});

describe("nodesEqual", () => {
  test("empty slices are equal", () => {
    expect(nodesEqual([], [])).toBe(true);
  });

  test("nil and empty slice are equal", () => {
    expect(nodesEqual(undefined, [])).toBe(true);
  });

  test("nil parameters vs empty parameters should be equal", () => {
    const local: Node[] = [
      {
        id: "1",
        name: "Test",
        type: "test",
        typeVersion: 1.0,
        position: [0, 0],
        parameters: undefined,
      },
    ];
    const remote: Node[] = [
      {
        id: "1",
        name: "Test",
        type: "test",
        typeVersion: 1.0,
        position: [0, 0],
        parameters: {},
      },
    ];
    expect(nodesEqual(local, remote)).toBe(true);
  });

  test("same nodes with parameters are equal", () => {
    const nodes: Node[] = [
      {
        id: "1",
        name: "Test",
        type: "test",
        typeVersion: 1.0,
        position: [100, 200],
        parameters: { key: "value" },
      },
    ];
    expect(nodesEqual(nodes, nodes)).toBe(true);
  });

  test("different node names are not equal", () => {
    const local: Node[] = [
      { id: "1", name: "Test1", type: "test", typeVersion: 1, position: [0, 0] },
    ];
    const remote: Node[] = [
      { id: "1", name: "Test2", type: "test", typeVersion: 1, position: [0, 0] },
    ];
    expect(nodesEqual(local, remote)).toBe(false);
  });

  test("different node count not equal", () => {
    const local: Node[] = [
      { id: "1", name: "Test1", type: "test", typeVersion: 1, position: [0, 0] },
      { id: "2", name: "Test2", type: "test", typeVersion: 1, position: [0, 0] },
    ];
    const remote: Node[] = [
      { id: "1", name: "Test1", type: "test", typeVersion: 1, position: [0, 0] },
    ];
    expect(nodesEqual(local, remote)).toBe(false);
  });

  test("different parameter values not equal", () => {
    const local: Node[] = [
      {
        id: "1",
        name: "Test",
        type: "test",
        typeVersion: 1,
        position: [0, 0],
        parameters: { key: "value1" },
      },
    ];
    const remote: Node[] = [
      {
        id: "1",
        name: "Test",
        type: "test",
        typeVersion: 1,
        position: [0, 0],
        parameters: { key: "value2" },
      },
    ];
    expect(nodesEqual(local, remote)).toBe(false);
  });
});

describe("connectionsEqual", () => {
  test("empty maps are equal", () => {
    expect(connectionsEqual({}, {})).toBe(true);
  });

  test("nil and empty map are equal", () => {
    expect(connectionsEqual(undefined, {})).toBe(true);
  });

  test("empty NodeConn vs NodeConn with empty Main should be equal", () => {
    const local: Record<string, NodeConn> = { Node1: {} };
    const remote: Record<string, NodeConn> = { Node1: { main: [] } };
    expect(connectionsEqual(local, remote)).toBe(true);
  });

  test("main with empty slice vs empty object should be equal", () => {
    const local: Record<string, NodeConn> = { Node1: { main: [[]] } };
    const remote: Record<string, NodeConn> = { Node1: {} };
    expect(connectionsEqual(local, remote)).toBe(true);
  });

  test("same connections are equal", () => {
    const conn: Record<string, NodeConn> = {
      Node1: {
        main: [[{ node: "Node2", type: "main", index: 0 }]],
      },
    };
    expect(connectionsEqual(conn, conn)).toBe(true);
  });

  test("different connections are not equal", () => {
    const local: Record<string, NodeConn> = {
      Node1: { main: [[{ node: "A", type: "main", index: 0 }]] },
    };
    const remote: Record<string, NodeConn> = {
      Node1: { main: [[{ node: "B", type: "main", index: 0 }]] },
    };
    expect(connectionsEqual(local, remote)).toBe(false);
  });

  test("different node keys not equal", () => {
    const local: Record<string, NodeConn> = {
      Node1: { main: [[{ node: "Target", type: "main", index: 0 }]] },
    };
    const remote: Record<string, NodeConn> = {
      Node2: { main: [[{ node: "Target", type: "main", index: 0 }]] },
    };
    expect(connectionsEqual(local, remote)).toBe(false);
  });
});

describe("compare", () => {
  test("identical workflows have no changes", () => {
    const wf: Workflow = {
      name: "Test",
      active: true,
      nodes: [{ id: "1", name: "Node1", type: "test", typeVersion: 1, position: [0, 0] }],
      connections: {},
    };
    const diff = compare(wf, wf);
    expect(diff.hasChanges).toBe(false);
  });

  test("nil vs empty in nodes should not cause changes", () => {
    const local: Workflow = {
      name: "Test",
      active: true,
      nodes: [
        {
          id: "1",
          name: "Node1",
          type: "test",
          typeVersion: 1,
          position: [0, 0],
          parameters: undefined,
        },
      ],
      connections: {},
    };
    const remote: Workflow = {
      name: "Test",
      active: true,
      nodes: [
        { id: "1", name: "Node1", type: "test", typeVersion: 1, position: [0, 0], parameters: {} },
      ],
      connections: {},
    };
    expect(compare(local, remote).hasChanges).toBe(false);
  });

  test("empty connections with main:[[]] vs {} should not cause changes", () => {
    const local: Workflow = {
      name: "Test",
      active: true,
      nodes: [],
      connections: { Node1: { main: [[]] } },
    };
    const remote: Workflow = {
      name: "Test",
      active: true,
      nodes: [],
      connections: { Node1: {} },
    };
    expect(compare(local, remote).hasChanges).toBe(false);
  });

  test("name change detected", () => {
    const local: Workflow = { name: "Test1", active: false, nodes: [], connections: {} };
    const remote: Workflow = { name: "Test2", active: false, nodes: [], connections: {} };
    expect(compare(local, remote).hasChanges).toBe(true);
  });

  test("active status change detected", () => {
    const local: Workflow = { name: "Test", active: true, nodes: [], connections: {} };
    const remote: Workflow = { name: "Test", active: false, nodes: [], connections: {} };
    expect(compare(local, remote).hasChanges).toBe(true);
  });
});

describe("pinDataEqual", () => {
  test("both nil are equal", () => {
    expect(pinDataEqual(undefined, undefined)).toBe(true);
  });

  test("nil and empty map are equal", () => {
    expect(pinDataEqual(undefined, {})).toBe(true);
  });

  test("same pinData are equal", () => {
    const data: Record<string, PinDataItem[]> = {
      Node1: [{ json: { key: "value" } }],
    };
    expect(pinDataEqual(data, data)).toBe(true);
  });

  test("different node names not equal", () => {
    const local: Record<string, PinDataItem[]> = { Node1: [{ json: { key: "value" } }] };
    const remote: Record<string, PinDataItem[]> = { Node2: [{ json: { key: "value" } }] };
    expect(pinDataEqual(local, remote)).toBe(false);
  });

  test("different data not equal", () => {
    const local: Record<string, PinDataItem[]> = { Node1: [{ json: { key: "value1" } }] };
    const remote: Record<string, PinDataItem[]> = { Node1: [{ json: { key: "value2" } }] };
    expect(pinDataEqual(local, remote)).toBe(false);
  });
});

describe("compare pinData", () => {
  test("pinData added", () => {
    const local: Workflow = {
      name: "Test",
      active: false,
      nodes: [],
      connections: {},
      pinData: { Node1: [{ json: { key: "value" } }] },
    };
    const remote: Workflow = { name: "Test", active: false, nodes: [], connections: {} };
    expect(compare(local, remote).hasChanges).toBe(true);
  });

  test("pinData removed", () => {
    const local: Workflow = { name: "Test", active: false, nodes: [], connections: {} };
    const remote: Workflow = {
      name: "Test",
      active: false,
      nodes: [],
      connections: {},
      pinData: { Node1: [{ json: { key: "value" } }] },
    };
    expect(compare(local, remote).hasChanges).toBe(true);
  });

  test("pinData unchanged", () => {
    const pinData: Record<string, PinDataItem[]> = { Node1: [{ json: { key: "value" } }] };
    const wf: Workflow = { name: "Test", active: false, nodes: [], connections: {}, pinData };
    expect(compare(wf, wf).hasChanges).toBe(false);
  });

  test("both nil pinData unchanged", () => {
    const wf: Workflow = { name: "Test", active: false, nodes: [], connections: {} };
    expect(compare(wf, wf).hasChanges).toBe(false);
  });
});
