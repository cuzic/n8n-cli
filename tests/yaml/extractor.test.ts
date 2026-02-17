import { describe, expect, test } from "bun:test";
import type { Workflow } from "@/api/types.ts";
import { countLines, externalFilesByNodeID, extractExternalFiles } from "@/yaml/extractor.ts";
import {
  calculateRelativeSubfilesPath,
  generateExternalFileContent,
  generateExternalFilePath,
  sanitizeNodeName,
} from "@/yaml/generator.ts";

describe("countLines", () => {
  test("empty string", () => {
    expect(countLines("")).toBe(0);
  });

  test("single line", () => {
    expect(countLines("hello")).toBe(1);
  });

  test("multiple lines", () => {
    expect(countLines("a\nb\nc")).toBe(3);
  });

  test("trailing newline doesn't count", () => {
    expect(countLines("a\nb\n")).toBe(2);
  });
});

describe("extractExternalFiles", () => {
  test("returns empty for null workflow", () => {
    expect(extractExternalFiles(null)).toEqual([]);
  });

  test("extracts jsCode from Code node", () => {
    const workflow: Workflow = {
      name: "Test",
      active: false,
      nodes: [
        {
          id: "node1",
          name: "コード実行",
          type: "n8n-nodes-base.code",
          typeVersion: 1,
          position: [0, 0],
          parameters: {
            jsCode: "line1\nline2\nline3\nline4",
          },
        },
      ],
      connections: {},
    };

    const files = extractExternalFiles(workflow, 3);
    expect(files).toHaveLength(1);
    expect(files[0]!.fieldName).toBe("jsCode");
    expect(files[0]!.fileType).toBe("js");
    expect(files[0]!.lineCount).toBe(4);
  });

  test("skips short code", () => {
    const workflow: Workflow = {
      name: "Test",
      active: false,
      nodes: [
        {
          id: "node1",
          name: "Short Code",
          type: "n8n-nodes-base.code",
          typeVersion: 1,
          position: [0, 0],
          parameters: {
            jsCode: "return [];",
          },
        },
      ],
      connections: {},
    };

    const files = extractExternalFiles(workflow, 3);
    expect(files).toHaveLength(0);
  });

  test("extracts sqlQuery from BigQuery node", () => {
    const workflow: Workflow = {
      name: "Test",
      active: false,
      nodes: [
        {
          id: "node1",
          name: "BQ クエリ",
          type: "n8n-nodes-base.googleBigQuery",
          typeVersion: 1,
          position: [0, 0],
          parameters: {
            sqlQuery: "SELECT\n  col1,\n  col2\nFROM table\nWHERE x = 1",
          },
        },
      ],
      connections: {},
    };

    const files = extractExternalFiles(workflow, 3);
    expect(files).toHaveLength(1);
    expect(files[0]!.fieldName).toBe("sqlQuery");
    expect(files[0]!.fileType).toBe("sql");
  });

  test("extracts AI Agent text and systemMessage", () => {
    const longText = "a".repeat(501);
    const workflow: Workflow = {
      name: "Test",
      active: false,
      nodes: [
        {
          id: "node1",
          name: "AI Agent",
          type: "@n8n/n8n-nodes-langchain.agent",
          typeVersion: 3,
          position: [0, 0],
          parameters: {
            text: longText,
            options: {
              systemMessage: "line1\nline2\nline3\nline4",
            },
          },
        },
      ],
      connections: {},
    };

    const files = extractExternalFiles(workflow, 3, 500);
    expect(files).toHaveLength(2);
    expect(files[0]!.fieldName).toBe("text");
    expect(files[0]!.fileType).toBe("md");
    expect(files[1]!.fieldName).toBe("options.systemMessage");
    expect(files[1]!.fileType).toBe("md");
  });

  test("skips AI Agent with short prompts", () => {
    const workflow: Workflow = {
      name: "Test",
      active: false,
      nodes: [
        {
          id: "node1",
          name: "AI Agent",
          type: "@n8n/n8n-nodes-langchain.agent",
          typeVersion: 3,
          position: [0, 0],
          parameters: {
            text: "short prompt",
            options: { systemMessage: "short system" },
          },
        },
      ],
      connections: {},
    };

    const files = extractExternalFiles(workflow, 3, 500);
    expect(files).toHaveLength(0);
  });
});

describe("externalFilesByNodeID", () => {
  test("groups files by node ID", () => {
    const files = [
      {
        nodeID: "n1",
        nodeName: "A",
        fieldName: "jsCode",
        content: "x",
        fileType: "js" as const,
        lineCount: 5,
      },
      {
        nodeID: "n1",
        nodeName: "A",
        fieldName: "text",
        content: "y",
        fileType: "md" as const,
        lineCount: 10,
      },
      {
        nodeID: "n2",
        nodeName: "B",
        fieldName: "sqlQuery",
        content: "z",
        fileType: "sql" as const,
        lineCount: 3,
      },
    ];

    const grouped = externalFilesByNodeID(files);
    expect(Object.keys(grouped)).toHaveLength(2);
    expect(grouped.n1).toHaveLength(2);
    expect(grouped.n2).toHaveLength(1);
  });
});

describe("sanitizeNodeName", () => {
  test("replaces special characters", () => {
    expect(sanitizeNodeName("My Node/Name")).toBe("my-node-name");
  });

  test("handles empty string", () => {
    expect(sanitizeNodeName("")).toBe("unnamed");
  });

  test("replaces ampersand", () => {
    expect(sanitizeNodeName("A & B")).toBe("a-and-b");
  });

  test("removes consecutive dashes", () => {
    expect(sanitizeNodeName("a  b")).toBe("a-b");
  });

  test("lowercases result", () => {
    expect(sanitizeNodeName("MyNode")).toBe("mynode");
  });
});

describe("generateExternalFileContent", () => {
  test("generates JS file with headers", () => {
    const content = generateExternalFileContent("コード実行", "テストWF", "return [];", "js");
    expect(content).toContain("// Node: コード実行");
    expect(content).toContain("// Workflow: テストWF");
    expect(content).toContain("return [];");
    expect(content.endsWith("\n")).toBe(true);
  });

  test("generates SQL file with headers", () => {
    const content = generateExternalFileContent("BQ Query", "My WF", "SELECT 1", "sql");
    expect(content).toContain("-- Node: BQ Query");
    expect(content).toContain("-- Workflow: My WF");
    expect(content).toContain("SELECT 1");
  });

  test("generates Markdown file with headers", () => {
    const content = generateExternalFileContent("AI Agent", "My WF", "Hello prompt", "md");
    expect(content).toContain("<!-- Node: AI Agent -->");
    expect(content).toContain("<!-- Workflow: My WF -->");
    expect(content).toContain("Hello prompt");
  });

  test("preserves expression mode prefix for Markdown", () => {
    const content = generateExternalFileContent(
      "AI Agent",
      "My WF",
      "=Expression prompt {{ $json.field }}",
      "md",
    );
    expect(content.startsWith("=")).toBe(true);
    expect(content).toContain("Expression prompt");
  });

  test("strips existing JS headers to prevent duplication", () => {
    const existingCode = "// Node: Old Name\n// Workflow: Old WF\n\nreturn [];";
    const content = generateExternalFileContent("New Name", "New WF", existingCode, "js");
    expect(content).not.toContain("Old Name");
    expect(content).toContain("// Node: New Name");
    expect(content).toContain("return [];");
  });
});

describe("generateExternalFilePath", () => {
  test("generates correct path for jsCode", () => {
    const p = generateExternalFilePath(
      "wf123",
      "テストWF",
      "コード実行",
      "jsCode",
      "js",
      "./_subfiles",
    );
    expect(p).toContain("_subfiles");
    expect(p).toContain("テストwf__wf123".toLowerCase());
    expect(p).toEndWith(".js");
  });

  test("adds -prompt suffix for text field", () => {
    const p = generateExternalFilePath("wf123", "WF", "Agent", "text", "md", "./_subfiles");
    expect(p).toContain("-prompt.md");
  });

  test("adds -system suffix for systemMessage field", () => {
    const p = generateExternalFilePath(
      "wf123",
      "WF",
      "Agent",
      "options.systemMessage",
      "md",
      "./_subfiles",
    );
    expect(p).toContain("-system.md");
  });
});

describe("calculateRelativeSubfilesPath", () => {
  test("same directory returns ./_subfiles", () => {
    const result = calculateRelativeSubfilesPath("definitions/wf.yaml", "definitions");
    expect(result).toBe("./_subfiles");
  });

  test("subdirectory returns ../_subfiles", () => {
    const result = calculateRelativeSubfilesPath(
      "definitions/example-project/wf.yaml",
      "definitions",
    );
    expect(result).toBe("../_subfiles");
  });
});
