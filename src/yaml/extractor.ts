import type { Node, Workflow } from "@/api/types.ts";

/** FileType represents the type of external file. */
export type FileType = "js" | "sql" | "md";

/** ExternalFile represents a code snippet that should be extracted to an external file. */
export interface ExternalFile {
  nodeID: string;
  nodeName: string;
  fieldName: string;
  content: string;
  fileType: FileType;
  lineCount: number;
}

/** Default minimum number of lines for code to be externalized. */
export const DefaultExternalizeThreshold = 3;

/** Default minimum number of characters for prompts to be externalized. */
export const DefaultExternalizeCharThreshold = 500;

/** Counts the number of lines in a string. Trailing newlines don't count as an extra line. */
export function countLines(s: string): number {
  if (s === "") return 0;
  let lines = 0;
  for (const ch of s) {
    if (ch === "\n") lines++;
  }
  lines++; // count last line
  if (s.endsWith("\n")) lines--;
  return lines;
}

/** Determines if code should be extracted based on line threshold. */
function shouldExternalize(code: string, threshold: number): boolean {
  if (code === "") return false;
  return countLines(code) >= threshold;
}

/** Determines if a prompt should be extracted (hybrid: line OR char threshold). */
function shouldExternalizePrompt(
  content: string,
  lineThreshold: number,
  charThreshold: number,
): boolean {
  if (content === "") return false;
  return countLines(content) >= lineThreshold || [...content].length >= charThreshold;
}

function isCodeNode(node: Node): boolean {
  return node.type === "n8n-nodes-base.code";
}

function isBigQueryNode(node: Node): boolean {
  return node.type === "n8n-nodes-base.googleBigQuery";
}

function isAIAgentNode(node: Node): boolean {
  return node.type === "@n8n/n8n-nodes-langchain.agent";
}

function getStringParam(node: Node, key: string): string {
  const val = node.parameters?.[key];
  return typeof val === "string" ? val : "";
}

function getSystemMessage(node: Node): string {
  const options = node.parameters?.options;
  if (options == null || typeof options !== "object") return "";
  const msg = (options as Record<string, unknown>).systemMessage;
  return typeof msg === "string" ? msg : "";
}

/**
 * Scans workflow nodes and extracts code that should be externalized.
 * Returns a list of ExternalFile entries for code exceeding the thresholds.
 */
export function extractExternalFiles(
  workflow: Workflow | null,
  lineThreshold = DefaultExternalizeThreshold,
  charThreshold = DefaultExternalizeCharThreshold,
): ExternalFile[] {
  if (!workflow) return [];

  const lt = lineThreshold > 0 ? lineThreshold : DefaultExternalizeThreshold;
  const ct = charThreshold > 0 ? charThreshold : DefaultExternalizeCharThreshold;

  const files: ExternalFile[] = [];

  for (const node of workflow.nodes) {
    // Code nodes → jsCode
    if (isCodeNode(node)) {
      const jsCode = getStringParam(node, "jsCode");
      if (shouldExternalize(jsCode, lt)) {
        files.push({
          nodeID: node.id,
          nodeName: node.name,
          fieldName: "jsCode",
          content: jsCode,
          fileType: "js",
          lineCount: countLines(jsCode),
        });
      }
    }

    // BigQuery nodes → sqlQuery
    if (isBigQueryNode(node)) {
      const sqlQuery = getStringParam(node, "sqlQuery");
      if (shouldExternalize(sqlQuery, lt)) {
        files.push({
          nodeID: node.id,
          nodeName: node.name,
          fieldName: "sqlQuery",
          content: sqlQuery,
          fileType: "sql",
          lineCount: countLines(sqlQuery),
        });
      }
    }

    // AI Agent nodes → text, options.systemMessage
    if (isAIAgentNode(node)) {
      const agentText = getStringParam(node, "text");
      if (shouldExternalizePrompt(agentText, lt, ct)) {
        files.push({
          nodeID: node.id,
          nodeName: node.name,
          fieldName: "text",
          content: agentText,
          fileType: "md",
          lineCount: countLines(agentText),
        });
      }

      const systemMessage = getSystemMessage(node);
      if (shouldExternalizePrompt(systemMessage, lt, ct)) {
        files.push({
          nodeID: node.id,
          nodeName: node.name,
          fieldName: "options.systemMessage",
          content: systemMessage,
          fileType: "md",
          lineCount: countLines(systemMessage),
        });
      }
    }
  }

  return files;
}

/** Returns a map of node ID to external files for quick lookup. */
export function externalFilesByNodeID(files: ExternalFile[]): Record<string, ExternalFile[]> {
  const result: Record<string, ExternalFile[]> = {};
  for (const f of files) {
    if (!result[f.nodeID]) {
      result[f.nodeID] = [];
    }
    result[f.nodeID]?.push(f);
  }
  return result;
}
