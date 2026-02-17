import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Workflow } from "@/api/types.ts";
import {
  embedWorkflowID,
  generateFilePath,
  generateYamlFilePath,
  sanitizeFilename,
  writeWorkflowJSON,
} from "@/importer/writer.ts";

describe("sanitizeFilename", () => {
  test("basic name", () => {
    expect(sanitizeFilename("My Workflow")).toBe("my-workflow");
  });

  test("replaces special characters", () => {
    expect(sanitizeFilename("A & B")).toBe("a-and-b");
  });

  test("removes invalid characters", () => {
    expect(sanitizeFilename("Test*File?")).toBe("testfile");
  });

  test("handles Japanese characters", () => {
    const result = sanitizeFilename("日次レポート");
    expect(result).toBe("日次レポート");
  });

  test("replaces separator characters", () => {
    expect(sanitizeFilename("A/B:C")).toBe("a-b-c");
  });

  test("compresses consecutive hyphens", () => {
    expect(sanitizeFilename("A  B   C")).toBe("a-b-c");
  });

  test("trims leading/trailing hyphens", () => {
    expect(sanitizeFilename(" test ")).toBe("test");
  });

  test("handles empty string", () => {
    expect(sanitizeFilename("")).toBe("unnamed");
  });

  test("handles arrow character", () => {
    expect(sanitizeFilename("A→B")).toBe("a-b");
  });

  test("handles parentheses", () => {
    expect(sanitizeFilename("A（B）")).toBe("a-b");
  });

  test("lowercases", () => {
    expect(sanitizeFilename("MyWorkflow")).toBe("myworkflow");
  });
});

describe("generateFilePath", () => {
  test("generates correct JSON path", () => {
    const p = generateFilePath("defs", "abc123", "テスト WF");
    expect(p).toBe(path.join("defs", "テスト-wf__abc123.json"));
  });
});

describe("generateYamlFilePath", () => {
  test("generates correct YAML path", () => {
    const p = generateYamlFilePath("defs", "abc123", "テスト WF");
    expect(p).toBe(path.join("defs", "テスト-wf__abc123.yaml"));
  });
});

describe("writeWorkflowJSON", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "writer-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("writes formatted JSON with trailing newline", () => {
    const wf: Workflow = {
      id: "wf1",
      name: "Test",
      active: false,
      nodes: [],
      connections: {},
    };
    const filePath = path.join(tmpDir, "test.json");
    writeWorkflowJSON(filePath, wf);

    const content = fs.readFileSync(filePath, "utf-8");
    expect(content).toContain('"id": "wf1"');
    expect(content).toContain('"name": "Test"');
    expect(content.endsWith("\n")).toBe(true);

    // Verify it's valid JSON
    const parsed = JSON.parse(content);
    expect(parsed.id).toBe("wf1");
  });

  test("creates parent directories", () => {
    const wf: Workflow = {
      id: "wf2",
      name: "Nested",
      active: false,
      nodes: [],
      connections: {},
    };
    const filePath = path.join(tmpDir, "sub", "dir", "test.json");
    writeWorkflowJSON(filePath, wf);

    expect(fs.existsSync(filePath)).toBe(true);
  });
});

describe("embedWorkflowID", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "embed-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("embeds ID into JSON file without existing ID", () => {
    const wf = { name: "Test", nodes: [], connections: {} };
    const filePath = path.join(tmpDir, "wf.json");
    fs.writeFileSync(filePath, JSON.stringify(wf, null, 2));

    embedWorkflowID(filePath, "new-id-123");

    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(content);
    expect(parsed.id).toBe("new-id-123");
    expect(parsed.name).toBe("Test");
  });

  test("throws if ID already exists", () => {
    const wf = { id: "existing", name: "Test", nodes: [], connections: {} };
    const filePath = path.join(tmpDir, "wf.json");
    fs.writeFileSync(filePath, JSON.stringify(wf, null, 2));

    expect(() => embedWorkflowID(filePath, "new-id")).toThrow("ID already exists");
  });

  test("allows embedding if ID field is empty string", () => {
    const wf = { id: "", name: "Test", nodes: [], connections: {} };
    const filePath = path.join(tmpDir, "wf.json");
    fs.writeFileSync(filePath, JSON.stringify(wf, null, 2));

    embedWorkflowID(filePath, "new-id");

    const parsed = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    expect(parsed.id).toBe("new-id");
  });
});
