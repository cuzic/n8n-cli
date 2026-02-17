import { readdirSync, statSync } from "node:fs";
import path from "node:path";
import type { Command } from "commander";
import { WORKFLOW_EXTENSIONS } from "@/common/extensions.ts";
import { formatWorkflowAsync } from "../../formatter/formatter.ts";
import { generateChangeReport } from "../../formatter/reporter.ts";
import { ErrReadOnlyFile } from "../../formatter/workflow.ts";

/** registerFmtCommand registers the fmt subcommand */
export function registerFmtCommand(program: Command): void {
  program
    .command("fmt")
    .description("Format workflow files by reorganizing node positions")
    .option("--dry-run", "Show changes without saving", false)
    .option("-d, --directory <dir>", "Directory to scan for workflow files")
    .argument("[files...]", "Workflow JSON files to format")
    .action(async (files: string[], opts: { dryRun: boolean; directory?: string }) => {
      const targetFiles = [...files];

      // If directory is specified, scan for workflow files
      if (opts.directory) {
        const dirFiles = scanWorkflowFiles(opts.directory);
        targetFiles.push(...dirFiles);
      }

      if (targetFiles.length === 0) {
        console.error("Error: no files specified. Use -d <directory> or provide file paths.");
        process.exit(1);
      }

      let hasErrors = false;

      for (const filePath of targetFiles) {
        const result = await formatWorkflowAsync(filePath, {
          dryRun: opts.dryRun,
        });

        if (!result.success) {
          console.error(`Error formatting ${filePath}: ${result.error?.message}`);
          hasErrors = true;
          continue;
        }

        const report = generateChangeReport(filePath, result.changes);
        process.stdout.write(report);

        if (result.error === ErrReadOnlyFile) {
          console.log(`  (read-only: ${path.extname(filePath)} files cannot be written back)`);
        }
      }

      if (hasErrors) {
        process.exit(1);
      }
    });
}

/** scanWorkflowFiles recursively scans a directory for workflow files (.json, .yaml, .yml, .jsonnet) */
function scanWorkflowFiles(dir: string): string[] {
  const results: string[] = [];

  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = statSync(fullPath);

      if (stat.isDirectory()) {
        // Skip _subfiles directories (they contain external files, not workflows)
        if (entry === "_subfiles") continue;
        results.push(...scanWorkflowFiles(fullPath));
      } else {
        const ext = path.extname(entry).toLowerCase();
        if (WORKFLOW_EXTENSIONS.has(ext)) {
          results.push(fullPath);
        }
      }
    }
  } catch {
    // Skip unreadable directories
  }

  return results;
}
