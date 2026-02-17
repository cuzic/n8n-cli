import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  ErrEmptyWorkflow,
  ErrMissingNodes,
  ErrReadOnlyFile,
  type FormatterWorkflow,
  isReadOnlyFile,
  loadWorkflowAsync,
  saveWorkflow,
} from "@/formatter/workflow.ts";

const minimalWorkflow = {
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
  ],
  connections: {},
};

describe("isReadOnlyFile", () => {
  test("returns true for .yaml", () => {
    expect(isReadOnlyFile("workflow.yaml")).toBe(true);
  });

  test("returns true for .yml", () => {
    expect(isReadOnlyFile("workflow.yml")).toBe(true);
  });

  test("returns false for .json", () => {
    expect(isReadOnlyFile("workflow.json")).toBe(false);
  });
});

describe("saveWorkflow", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "save-wf-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("saves JSON file normally", () => {
    const filePath = path.join(tmpDir, "wf.json");
    saveWorkflow(filePath, minimalWorkflow as FormatterWorkflow);
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content);
    expect(parsed.name).toBe("Test");
  });

  test("throws ErrReadOnlyFile for .yaml", () => {
    const filePath = path.join(tmpDir, "wf.yaml");
    expect(() => saveWorkflow(filePath, minimalWorkflow as FormatterWorkflow)).toThrow(
      ErrReadOnlyFile,
    );
  });

  test("throws ErrReadOnlyFile for .yml", () => {
    const filePath = path.join(tmpDir, "wf.yml");
    expect(() => saveWorkflow(filePath, minimalWorkflow as FormatterWorkflow)).toThrow(
      ErrReadOnlyFile,
    );
  });
});

describe("loadWorkflowAsync", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "load-async-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("loads a JSON file", async () => {
    const filePath = path.join(tmpDir, "wf.json");
    fs.writeFileSync(filePath, JSON.stringify(minimalWorkflow));

    const wf = await loadWorkflowAsync(filePath);
    expect(wf.name).toBe("Test");
    expect(wf.nodes).toHaveLength(1);
  });

  test("loads a YAML file", async () => {
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
connections: {}
`,
    );

    const wf = await loadWorkflowAsync(filePath);
    expect(wf.name).toBe("YAML Test");
    expect(wf.nodes).toHaveLength(1);
  });

  test("throws ErrMissingNodes for YAML without nodes", async () => {
    const filePath = path.join(tmpDir, "no-nodes.yaml");
    fs.writeFileSync(filePath, "name: Bad\nactive: false\nconnections: {}\n");

    await expect(loadWorkflowAsync(filePath)).rejects.toThrow(ErrMissingNodes);
  });

  test("throws ErrEmptyWorkflow for YAML with empty nodes", async () => {
    const filePath = path.join(tmpDir, "empty-nodes.yaml");
    fs.writeFileSync(filePath, "name: Empty\nactive: false\nnodes: []\nconnections: {}\n");

    await expect(loadWorkflowAsync(filePath)).rejects.toThrow(ErrEmptyWorkflow);
  });

  test("throws on invalid JSON file", async () => {
    const filePath = path.join(tmpDir, "bad.json");
    fs.writeFileSync(filePath, "not json");

    await expect(loadWorkflowAsync(filePath)).rejects.toThrow();
  });

  test("throws on invalid YAML file", async () => {
    const filePath = path.join(tmpDir, "bad.yaml");
    fs.writeFileSync(filePath, ":\n  :\n  - : :\n  invalid: [unclosed");

    await expect(loadWorkflowAsync(filePath)).rejects.toThrow();
  });
});
