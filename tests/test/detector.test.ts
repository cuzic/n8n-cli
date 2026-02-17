import { describe, expect, it } from "bun:test";
import type { Node, Workflow } from "../../src/api/types.ts";
import {
  buildWebhookURL,
  detectTestWebhook,
  isTestWebhook,
  NoTestWebhookError,
} from "../../src/test/detector.ts";

function makeWorkflow(id: string, name: string, nodes: Node[]): Workflow {
  return {
    id,
    name,
    active: true,
    nodes,
    connections: {},
  };
}

describe("detectTestWebhook", () => {
  it("detects valid test webhook", () => {
    const workflow = makeWorkflow("test-1", "Test Workflow", [
      {
        id: "node-1",
        name: "[CLI Test] Test Entry",
        type: "n8n-nodes-base.webhook",
        typeVersion: 2.1,
        position: [-200, 0],
        parameters: {
          httpMethod: "POST",
          path: "__cli-test__/abc123",
        },
      },
    ]);

    const info = detectTestWebhook(workflow);
    expect(info.path).toBe("__cli-test__/abc123");
    expect(info.httpMethod).toBe("POST");
  });

  it("detects GET method webhook", () => {
    const workflow = makeWorkflow("test-2", "Test Workflow GET", [
      {
        id: "node-1",
        name: "[CLI Test] GET Webhook",
        type: "n8n-nodes-base.webhook",
        typeVersion: 2.1,
        position: [0, 0],
        parameters: {
          httpMethod: "GET",
          path: "__cli-test__/def456",
        },
      },
    ]);

    const info = detectTestWebhook(workflow);
    expect(info.path).toBe("__cli-test__/def456");
    expect(info.httpMethod).toBe("GET");
  });

  it("throws for production webhook only", () => {
    const workflow = makeWorkflow("test-3", "Production Workflow", [
      {
        id: "node-1",
        name: "Production Webhook",
        type: "n8n-nodes-base.webhook",
        typeVersion: 2.1,
        position: [0, 0],
        parameters: {
          httpMethod: "POST",
          path: "f2a48863-0e31-4582-a5a6-5fa20c138f51",
        },
      },
    ]);

    expect(() => detectTestWebhook(workflow)).toThrow(NoTestWebhookError);
  });

  it("throws for no webhook nodes", () => {
    const workflow = makeWorkflow("test-4", "No Webhook", [
      {
        id: "node-1",
        name: "Manual Trigger",
        type: "n8n-nodes-base.manualTrigger",
        typeVersion: 1,
        position: [0, 0],
      },
    ]);

    expect(() => detectTestWebhook(workflow)).toThrow(NoTestWebhookError);
  });

  it("throws for null workflow", () => {
    expect(() => detectTestWebhook(null)).toThrow();
  });
});

describe("isTestWebhook", () => {
  it("returns true for valid test webhook", () => {
    const node: Node = {
      id: "1",
      name: "[CLI Test] Test Entry",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2.1,
      position: [0, 0],
      parameters: { path: "5bf62c14-fca6-4ec0-92f7-6d07bd1c39b7" },
    };
    expect(isTestWebhook(node)).toBe(true);
  });

  it("returns false for production webhook", () => {
    const node: Node = {
      id: "1",
      name: "Production Webhook",
      type: "n8n-nodes-base.webhook",
      typeVersion: 2.1,
      position: [0, 0],
      parameters: { path: "f2a48863-0e31-4582-a5a6-5fa20c138f51" },
    };
    expect(isTestWebhook(node)).toBe(false);
  });

  it("returns false for non-webhook node", () => {
    const node: Node = {
      id: "1",
      name: "Trigger",
      type: "n8n-nodes-base.manualTrigger",
      typeVersion: 1,
      position: [0, 0],
    };
    expect(isTestWebhook(node)).toBe(false);
  });

  it("returns false for null node", () => {
    expect(isTestWebhook(null)).toBe(false);
  });
});

describe("buildWebhookURL", () => {
  it("standard base URL", () => {
    expect(buildWebhookURL("https://n8n.example.com", "__cli-test__/abc123")).toBe(
      "https://n8n.example.com/webhook/__cli-test__/abc123",
    );
  });

  it("base URL with trailing slash", () => {
    expect(buildWebhookURL("https://n8n.example.com/", "__cli-test__/abc123")).toBe(
      "https://n8n.example.com/webhook/__cli-test__/abc123",
    );
  });

  it("base URL with api/v1", () => {
    expect(buildWebhookURL("https://n8n.example.com/api/v1", "__cli-test__/abc123")).toBe(
      "https://n8n.example.com/webhook/__cli-test__/abc123",
    );
  });

  it("path with leading slash", () => {
    expect(buildWebhookURL("https://n8n.example.com", "/__cli-test__/abc123")).toBe(
      "https://n8n.example.com/webhook/__cli-test__/abc123",
    );
  });
});

describe("NoTestWebhookError", () => {
  it("has correct error message", () => {
    const err = new NoTestWebhookError("abc123", "Test Workflow");
    expect(err.message).toBe('no test webhook found in workflow "Test Workflow" (abc123)');
  });

  it("has non-empty hint", () => {
    const err = new NoTestWebhookError("abc123", "Test Workflow");
    expect(err.hint()).toBeTruthy();
    expect(err.hint().length).toBeGreaterThan(0);
  });
});
