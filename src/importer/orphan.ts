import fs from "node:fs";
import path from "node:path";
import type { Workflow } from "@/api/types.ts";
import type { ImportResult, OrphanFile, OrphanFileMap } from "./types.ts";
import { embedWorkflowID } from "./writer.ts";

/** Filename excluded from subfile cleanup. */
const ProtectedFilename = "description.md";

/**
 * Cleans up orphan files (files without workflow ID).
 * In dry-run mode, just records what would happen.
 */
export function cleanupOrphanFiles(
  orphanMap: OrphanFileMap,
  dryRun: boolean,
  result: ImportResult,
): void {
  for (const orphan of orphanMap.all()) {
    if (dryRun) {
      result.addOperation({
        workflowID: "",
        workflowName: orphan.name,
        type: "cleanup",
        localPath: orphan.path,
        reason: "orphan file (no ID) would be deleted",
      });
      continue;
    }

    try {
      fs.unlinkSync(orphan.path);
      result.addOperation({
        workflowID: "",
        workflowName: orphan.name,
        type: "cleanup",
        localPath: orphan.path,
        reason: "orphan file (no ID) deleted",
      });
    } catch (err) {
      result.addOperation({
        workflowID: "",
        workflowName: orphan.name,
        type: "error",
        localPath: orphan.path,
        reason: `failed to delete orphan file: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }
}

/**
 * Matches orphan files with remote workflows by name, then embeds IDs.
 * Skips ambiguous matches (multiple remote or multiple local files with same name).
 */
export function matchOrphansByName(
  orphanMap: OrphanFileMap,
  remoteNameMap: Map<string, Workflow[]>,
  dryRun: boolean,
  result: ImportResult,
): void {
  for (const name of orphanMap.names()) {
    const remoteWorkflows = remoteNameMap.get(name);
    if (!remoteWorkflows?.length) continue;

    const orphanFiles = orphanMap.getByName(name);

    // Skip ambiguous matches
    if (remoteWorkflows.length > 1 || orphanFiles.length > 1) {
      reportAmbiguousMatch(name, orphanFiles, remoteWorkflows);
      continue;
    }

    const remoteWorkflow = remoteWorkflows[0]!;
    const orphanFile = orphanFiles[0]!;

    if (dryRun) {
      result.addOperation({
        workflowID: remoteWorkflow.id ?? "",
        workflowName: orphanFile.name,
        type: "match",
        localPath: orphanFile.path,
        reason: "would embed ID from remote workflow",
      });
    } else {
      // embedWorkflowID only supports JSON files
      if (orphanFile.sourceType !== "json") {
        result.addOperation({
          workflowID: remoteWorkflow.id ?? "",
          workflowName: orphanFile.name,
          type: "skip",
          localPath: orphanFile.path,
          reason: `skipped: embedding ID into ${orphanFile.sourceType.toUpperCase()} files is not yet supported`,
        });
        // Remove from orphan map to prevent deletion by cleanupOrphanFiles
        orphanMap.remove(orphanFile.path);
        continue;
      }

      try {
        embedWorkflowID(orphanFile.path, remoteWorkflow.id ?? "");

        result.addOperation({
          workflowID: remoteWorkflow.id ?? "",
          workflowName: orphanFile.name,
          type: "match",
          localPath: orphanFile.path,
          reason: "embedded ID from remote workflow",
        });
        // Remove from orphan map after successful ID embedding
        orphanMap.remove(orphanFile.path);
      } catch (err) {
        result.addOperation({
          workflowID: remoteWorkflow.id ?? "",
          workflowName: orphanFile.name,
          type: "error",
          localPath: orphanFile.path,
          reason: `failed to embed ID: ${err instanceof Error ? err.message : String(err)}`,
        });
        continue;
      }
    }

    orphanMap.remove(orphanFile.path);
  }
}

/**
 * Cleans up orphan external files in a _subfiles directory.
 * Compares files on disk with the list of paths written by writeWorkflowYAML.
 * Files not in writtenPaths are deleted (except description.md).
 */
export function cleanupOrphanSubfiles(
  subfilesDir: string,
  writtenPaths: string[],
  dryRun: boolean,
  result: ImportResult,
): void {
  if (!fs.existsSync(subfilesDir)) return;

  const writtenSet = new Set(writtenPaths.map((p) => path.resolve(p)));

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(subfilesDir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name.toLowerCase() === ProtectedFilename) continue;

    const filePath = path.resolve(path.join(subfilesDir, entry.name));
    if (writtenSet.has(filePath)) continue;

    if (dryRun) {
      result.addOperation({
        workflowID: "",
        workflowName: "",
        type: "cleanup",
        localPath: filePath,
        reason: "orphan subfile would be deleted",
      });
      continue;
    }

    try {
      fs.unlinkSync(filePath);
      result.addOperation({
        workflowID: "",
        workflowName: "",
        type: "cleanup",
        localPath: filePath,
        reason: "orphan subfile deleted",
      });
    } catch (err) {
      result.addOperation({
        workflowID: "",
        workflowName: "",
        type: "error",
        localPath: filePath,
        reason: `failed to delete orphan subfile: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }
}

/** Reports an ambiguous match to stderr. */
function reportAmbiguousMatch(
  name: string,
  localFiles: OrphanFile[],
  remoteWorkflows: Workflow[],
): void {
  console.error(`Warning: Ambiguous match for workflow '${name}':`);
  if (localFiles.length > 1) {
    console.error("  Local files with this name:");
    for (const f of localFiles) {
      console.error(`    - ${f.path}`);
    }
  }
  if (remoteWorkflows.length > 1) {
    console.error("  Remote workflows with this name:");
    for (const w of remoteWorkflows) {
      console.error(`    - ID: ${w.id}`);
    }
  }
  console.error("  Skipping automatic ID embedding.\n");
}
