import fs from "node:fs";
import path from "node:path";
import type { Workflow } from "@/api/types.ts";
import { extractWorkflowIDFromFilename } from "@/naming/naming.ts";
import { OrphanFileMap, type SourceType, WorkflowIDMap } from "./types.ts";

/**
 * Scans a directory recursively for workflow JSON, YAML, and Jsonnet files.
 * Returns a WorkflowIDMap containing workflow ID → file path mappings.
 */
export function scanDirectory(dir: string): WorkflowIDMap {
  const idMap = new WorkflowIDMap();

  if (!fs.existsSync(dir)) {
    return idMap;
  }

  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) {
    throw new Error(`not a directory: ${dir}`);
  }

  walkDir(dir, (filePath, entry) => {
    const ext = path.extname(entry.name).toLowerCase();

    if (ext === ".json") {
      const id = extractWorkflowIDFromJSON(filePath);
      if (id) idMap.add(id, filePath);
    } else if (ext === ".yaml" || ext === ".yml") {
      const id = extractWorkflowIDFromJSON(filePath);
      if (id) idMap.add(id, filePath);
    }
  });

  return idMap;
}

/**
 * Scans a directory recursively for workflow files, returning both
 * a WorkflowIDMap (files with IDs) and an OrphanFileMap (files without IDs).
 */
export function scanDirectoryWithOrphans(dir: string): [WorkflowIDMap, OrphanFileMap] {
  const idMap = new WorkflowIDMap();
  const orphanMap = new OrphanFileMap();

  if (!fs.existsSync(dir)) {
    return [idMap, orphanMap];
  }

  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) {
    throw new Error(`not a directory: ${dir}`);
  }

  walkDir(dir, (filePath, entry) => {
    const ext = path.extname(entry.name).toLowerCase();

    if (ext === ".json" || ext === ".yaml" || ext === ".yml") {
      const [id, name] = extractIDAndName(filePath);
      const sourceType: SourceType = ext === ".json" ? "json" : "yaml";
      if (id) {
        idMap.add(id, filePath);
      } else if (name) {
        orphanMap.add({ path: filePath, name, sourceType });
      }
    }
  });

  return [idMap, orphanMap];
}

/** Parses a workflow JSON file and returns the full Workflow object. */
export function parseWorkflowFile(filePath: string): Workflow {
  const data = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(data) as Workflow;
}

/** Walk a directory recursively, skipping underscore-prefixed dirs. */
function walkDir(dir: string, callback: (filePath: string, entry: fs.Dirent) => void): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Skip underscore-prefixed directories (e.g., _subfiles)
      if (entry.name.startsWith("_")) continue;
      walkDir(fullPath, callback);
    } else if (entry.isFile()) {
      callback(fullPath, entry);
    }
  }
}

/** Extracts the workflow ID from a JSON/YAML file by parsing the `id` field. */
function extractWorkflowIDFromJSON(filePath: string): string {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(data) as Record<string, unknown>;
    const id = parsed.id;
    if (typeof id === "string" && id) {
      // Check filename ID mismatch
      const [filenameID, found] = extractWorkflowIDFromFilename(filePath);
      if (found && filenameID !== id) {
        console.error(
          `Warning: ${filePath}: filename ID (${filenameID}) does not match JSON ID (${id}), using JSON ID`,
        );
      }
      return id;
    }
  } catch {
    // Silently skip unparseable files
  }
  return "";
}

/** Extracts both ID and name from a JSON/YAML file. */
function extractIDAndName(filePath: string): [string, string] {
  try {
    const data = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(data) as Record<string, unknown>;
    const id = typeof parsed.id === "string" ? parsed.id : "";
    const name = typeof parsed.name === "string" ? parsed.name : "";
    return [id, name];
  } catch {
    return ["", ""];
  }
}
