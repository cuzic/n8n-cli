import { describe, expect, test } from "bun:test";
import { parseDiffSpec } from "../../../src/apply/threeway/diffspec.ts";

describe("parseDiffSpec", () => {
  const successCases = [
    {
      name: "double dot - origin/main..HEAD",
      spec: "origin/main..HEAD",
      wantBase: "origin/main",
      wantHead: "HEAD",
      wantTriple: false,
    },
    {
      name: "double dot - HEAD~3..HEAD",
      spec: "HEAD~3..HEAD",
      wantBase: "HEAD~3",
      wantHead: "HEAD",
      wantTriple: false,
    },
    {
      name: "double dot - commit hashes",
      spec: "abc123..def456",
      wantBase: "abc123",
      wantHead: "def456",
      wantTriple: false,
    },
    {
      name: "triple dot - main...feature",
      spec: "main...feature",
      wantBase: "main",
      wantHead: "feature",
      wantTriple: true,
    },
    {
      name: "triple dot - with spaces (trimmed)",
      spec: " origin/main ... HEAD ",
      wantBase: "origin/main",
      wantHead: "HEAD",
      wantTriple: true,
    },
  ];

  for (const tc of successCases) {
    test(tc.name, () => {
      const result = parseDiffSpec(tc.spec);
      expect(result.baseRef).toBe(tc.wantBase);
      expect(result.headRef).toBe(tc.wantHead);
      expect(result.isTripleDot).toBe(tc.wantTriple);
      expect(result.rawSpec).toBe(tc.spec);
    });
  }

  const errorCases = [
    { name: "empty spec", spec: "", errContains: "empty diff spec" },
    { name: "no separator", spec: "origin/main", errContains: "invalid diff spec format" },
    { name: "single dot", spec: "origin/main.HEAD", errContains: "invalid diff spec format" },
    { name: "empty base ref", spec: "..HEAD", errContains: "empty base ref" },
    { name: "empty head ref", spec: "origin/main..", errContains: "empty head ref" },
    { name: "empty base ref triple dot", spec: "...HEAD", errContains: "empty base ref" },
    { name: "empty head ref triple dot", spec: "origin/main...", errContains: "empty head ref" },
  ];

  for (const tc of errorCases) {
    test(tc.name, () => {
      expect(() => parseDiffSpec(tc.spec)).toThrow(tc.errContains);
    });
  }
});
