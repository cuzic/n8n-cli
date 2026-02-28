import { describe, expect, test } from "bun:test";
import type { Workflow } from "@/api/types.ts";
import { hardcodedSecretsRule } from "@/lint/rules/hardcoded-secrets.ts";

function makeWorkflow(nodes: Workflow["nodes"]): Workflow {
  return { name: "Test", active: false, nodes, connections: {} };
}

describe("hardcoded-secrets rule", () => {
  test("name is hardcoded-secrets", () => {
    expect(hardcodedSecretsRule.name).toBe("hardcoded-secrets");
  });

  test("default severity is error", () => {
    expect(hardcodedSecretsRule.defaultSeverity).toBe("error");
  });

  test("null workflow returns no violations", () => {
    expect(hardcodedSecretsRule.check(null, "").length).toBe(0);
  });

  test("detects OpenAI API key in HTTP Request header", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "HTTP Request",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 1,
        position: [0, 0],
        parameters: {
          headers: {
            parameters: [
              { name: "Authorization", value: "Bearer sk-abcdefghijklmnopqrstuvwxyz123456" },
            ],
          },
        },
      },
    ]);
    const violations = hardcodedSecretsRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("HTTP Request");
    expect(violations[0]!.message).toContain("OpenAI API Key");
  });

  test("detects Stripe key in parameters", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "Set",
        type: "n8n-nodes-base.set",
        typeVersion: 1,
        position: [0, 0],
        parameters: { apiKey: "pk_live_XXXXXXXXXXXXXXXXXXXXXXXX" },
      },
    ]);
    const violations = hardcodedSecretsRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("Stripe Key");
  });

  test("detects GitHub token", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "HTTP Request",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 1,
        position: [0, 0],
        parameters: { token: "ghp_abcdefghijklmnopqrstuvwxyz1234567890" },
      },
    ]);
    const violations = hardcodedSecretsRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("GitHub Token");
  });

  test("detects JWT token", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "Set",
        type: "n8n-nodes-base.set",
        typeVersion: 1,
        position: [0, 0],
        parameters: {
          token:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c",
        },
      },
    ]);
    const violations = hardcodedSecretsRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("JWT Token");
  });

  test("detects AWS access key", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "Set",
        type: "n8n-nodes-base.set",
        typeVersion: 1,
        position: [0, 0],
        parameters: { accessKeyId: "AKIAIOSFODNN7EXAMPLE" },
      },
    ]);
    const violations = hardcodedSecretsRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("AWS Access Key");
  });

  test("detects password in connection string", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "Postgres",
        type: "n8n-nodes-base.postgres",
        typeVersion: 1,
        position: [0, 0],
        parameters: { connectionString: "postgres://myuser:secretpassword@localhost:5432/mydb" },
      },
    ]);
    const violations = hardcodedSecretsRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("Connection String with Password");
  });

  test("detects secret in Code node jsCode parameter", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "Code",
        type: "n8n-nodes-base.code",
        typeVersion: 1,
        position: [0, 0],
        parameters: {
          jsCode:
            'const apiKey = "sk-abcdefghijklmnopqrstuvwxyz123456";\nreturn [{ json: { result: "ok" } }];',
        },
      },
    ]);
    const violations = hardcodedSecretsRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("Code");
    expect(violations[0]!.message).toContain("jsCode");
    expect(violations[0]!.message).toContain("OpenAI API Key");
  });

  test("detects Slack token", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "Slack",
        type: "n8n-nodes-base.slack",
        typeVersion: 1,
        position: [0, 0],
        parameters: { token: "xoxb-123456789012-1234567890123-abcdefghij" },
      },
    ]);
    const violations = hardcodedSecretsRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("Slack Token");
  });

  test("detects Google API key", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "HTTP Request",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 1,
        position: [0, 0],
        parameters: { apiKey: "AIzaSyDaGmWKa4JsXZ-HjGw7ISLn_3namBGewQe" },
      },
    ]);
    const violations = hardcodedSecretsRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("Google API Key");
  });

  test("detects Anthropic API key", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "HTTP Request",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 1,
        position: [0, 0],
        parameters: { apiKey: "sk-ant-api03-abcdefghijklmnopqrstuvwxyz" },
      },
    ]);
    const violations = hardcodedSecretsRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("Anthropic API Key");
  });

  test("skips expression values with = prefix", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "HTTP Request",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 1,
        position: [0, 0],
        parameters: { apiKey: "={{ $env.OPENAI_API_KEY }}" },
      },
    ]);
    expect(hardcodedSecretsRule.check(wf, "").length).toBe(0);
  });

  test("skips expression values with {{ $env", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "HTTP Request",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 1,
        position: [0, 0],
        parameters: { apiKey: "Bearer {{ $env.API_KEY }}" },
      },
    ]);
    expect(hardcodedSecretsRule.check(wf, "").length).toBe(0);
  });

  test("skips credential references with $credentials", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "HTTP Request",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 1,
        position: [0, 0],
        parameters: { apiKey: "={{ $credentials.apiKey }}" },
      },
    ]);
    expect(hardcodedSecretsRule.check(wf, "").length).toBe(0);
  });

  test("skips short strings", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "Set",
        type: "n8n-nodes-base.set",
        typeVersion: 1,
        position: [0, 0],
        parameters: { value: "short" },
      },
    ]);
    expect(hardcodedSecretsRule.check(wf, "").length).toBe(0);
  });

  test("skips UUIDs", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "Set",
        type: "n8n-nodes-base.set",
        typeVersion: 1,
        position: [0, 0],
        parameters: { id: "550e8400-e29b-41d4-a716-446655440000" },
      },
    ]);
    expect(hardcodedSecretsRule.check(wf, "").length).toBe(0);
  });

  test("skips plain text without secrets", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "Set",
        type: "n8n-nodes-base.set",
        typeVersion: 1,
        position: [0, 0],
        parameters: { message: "Hello, this is a normal message without any secrets." },
      },
    ]);
    expect(hardcodedSecretsRule.check(wf, "").length).toBe(0);
  });

  test("skips sticky notes", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "Note",
        type: "n8n-nodes-base.stickyNote",
        typeVersion: 1,
        position: [0, 0],
        parameters: { content: "sk-abcdefghijklmnopqrstuvwxyz123456" },
      },
    ]);
    expect(hardcodedSecretsRule.check(wf, "").length).toBe(0);
  });

  test("detects multiple secrets in different nodes", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "HTTP Request",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 1,
        position: [0, 0],
        parameters: { apiKey: "sk-abcdefghijklmnopqrstuvwxyz123456" },
      },
      {
        id: "2",
        name: "Postgres",
        type: "n8n-nodes-base.postgres",
        typeVersion: 1,
        position: [100, 0],
        parameters: { connectionString: "postgres://user:password@host:5432/db" },
      },
    ]);
    const violations = hardcodedSecretsRule.check(wf, "");
    expect(violations.length).toBe(2);
  });

  test("detects secret in nested parameters", () => {
    const wf = makeWorkflow([
      {
        id: "1",
        name: "HTTP Request",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 1,
        position: [0, 0],
        parameters: {
          options: {
            headers: {
              parameters: [{ name: "X-API-Key", value: "sk-abcdefghijklmnopqrstuvwxyz123456" }],
            },
          },
        },
      },
    ]);
    const violations = hardcodedSecretsRule.check(wf, "");
    expect(violations.length).toBe(1);
    expect(violations[0]!.message).toContain("options.headers.parameters[0].value");
  });
});
