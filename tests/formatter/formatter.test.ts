import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { formatWorkflowAsync, formatWorkflowWithOptions } from "@/formatter/formatter.ts";
import { ErrReadOnlyFile } from "@/formatter/workflow.ts";

const simpleWorkflow = {
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
      position: [500, 100],
      parameters: {},
    },
  ],
  connections: {
    Start: { main: [[{ node: "End", type: "main", index: 0 }]] },
  },
};

describe("formatWorkflowAsync", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fmt-async-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("formats a JSON file (dry-run)", async () => {
    const filePath = path.join(tmpDir, "wf.json");
    fs.writeFileSync(filePath, JSON.stringify(simpleWorkflow));

    const result = await formatWorkflowAsync(filePath, { dryRun: true });
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });

  test("formats a JSON file and writes back", async () => {
    const filePath = path.join(tmpDir, "wf.json");
    fs.writeFileSync(filePath, JSON.stringify(simpleWorkflow));

    const result = await formatWorkflowAsync(filePath, { dryRun: false });
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();

    // File should be rewritten
    const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    expect(content.name).toBe("Test");
  });

  test("formats a YAML file (dry-run) - success with read-only error", async () => {
    const filePath = path.join(tmpDir, "wf.yaml");
    fs.writeFileSync(
      filePath,
      `name: YAML Test
active: false
nodes:
  - id: "1"
    name: Start
    type: n8n-nodes-base.manualTrigger
    typeVersion: 1
    position: [0, 0]
    parameters: {}
  - id: "2"
    name: End
    type: n8n-nodes-base.noOp
    typeVersion: 1
    position: [500, 100]
    parameters: {}
connections:
  Start:
    main:
      - - node: End
          type: main
          index: 0
`,
    );

    const result = await formatWorkflowAsync(filePath, { dryRun: true });
    expect(result.success).toBe(true);
    expect(result.error).toBe(ErrReadOnlyFile);
  });

  test("formats a YAML file (non-dry-run) - does not write back", async () => {
    const filePath = path.join(tmpDir, "wf.yaml");
    const yamlContent = `name: YAML Test
active: false
nodes:
  - id: "1"
    name: Start
    type: n8n-nodes-base.manualTrigger
    typeVersion: 1
    position: [0, 0]
    parameters: {}
  - id: "2"
    name: End
    type: n8n-nodes-base.noOp
    typeVersion: 1
    position: [500, 100]
    parameters: {}
connections:
  Start:
    main:
      - - node: End
          type: main
          index: 0
`;
    fs.writeFileSync(filePath, yamlContent);

    const result = await formatWorkflowAsync(filePath, { dryRun: false });
    expect(result.success).toBe(true);
    expect(result.error).toBe(ErrReadOnlyFile);

    // File should NOT be modified
    const afterContent = fs.readFileSync(filePath, "utf-8");
    expect(afterContent).toBe(yamlContent);
  });

  test("returns error for invalid file", async () => {
    const filePath = path.join(tmpDir, "bad.json");
    fs.writeFileSync(filePath, "not json");

    const result = await formatWorkflowAsync(filePath, { dryRun: true });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  test("returns changes list", async () => {
    const filePath = path.join(tmpDir, "wf.json");
    fs.writeFileSync(filePath, JSON.stringify(simpleWorkflow));

    const result = await formatWorkflowAsync(filePath, { dryRun: true });
    expect(result.success).toBe(true);
    // The nodes have non-standard positions so there should be changes
    expect(result.changes.length).toBeGreaterThan(0);
  });
});

describe("formatWorkflowWithOptions (sync, existing)", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "fmt-sync-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("still works for JSON files", () => {
    const filePath = path.join(tmpDir, "wf.json");
    fs.writeFileSync(filePath, JSON.stringify(simpleWorkflow));

    const result = formatWorkflowWithOptions(filePath, { dryRun: true });
    expect(result.success).toBe(true);
  });
});
