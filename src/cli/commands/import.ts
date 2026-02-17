import type { Command } from "commander";
import {
  getEffectiveExternalizeThreshold,
  getEffectiveYamlEnabled,
  loadCLIConfig,
} from "../../config/claude-md.ts";
import { ImportExecutor } from "../../importer/executor.ts";
import { reportDryRun, reportProgress, reportSummary } from "../../importer/reporter.ts";
import { defaultImportOptions, type ImportOptions } from "../../importer/types.ts";
import { resolveContext } from "../root.ts";

export function registerImportCommand(parent: Command): void {
  parent
    .command("import")
    .description("Import workflows from n8n to local files")
    .option("--dry-run", "Preview changes without writing files", false)
    .option("-d, --dir <directory>", "Target directory for workflow files", "./definitions")
    .option("--ids <ids>", "Comma-separated workflow IDs to import (empty = all)")
    .option("--include-archived", "Include archived workflows", false)
    .option("--yaml", "Output as YAML format with external files", false)
    .option("--no-yaml", "Force JSON format output")
    .option("-t, --threshold <n>", "Minimum lines for code externalization", "0")
    .option("--cleanup-orphans", "Delete local files without matching remote workflow", false)
    .option("--cleanup-subfiles", "Delete orphan external files in _subfiles directories", false)
    .option("--tags <tags>", "Filter by tags (comma-separated, AND condition)")
    .action(async (options, command) => {
      const ctx = resolveContext(command.parent!);
      const cliConfig = loadCLIConfig();

      const yamlFlag = options.yaml === true;
      const noYamlFlag = options.yaml === false && "yaml" in options;

      const importOpts: ImportOptions = {
        ...defaultImportOptions(),
        directory: options.dir as string,
        dryRun: options.dryRun as boolean,
        includeArchived: options.includeArchived as boolean,
        yamlEnabled: getEffectiveYamlEnabled(yamlFlag, noYamlFlag, cliConfig),
        externalizeThreshold: getEffectiveExternalizeThreshold(
          Number.parseInt(options.threshold as string, 10) || 0,
          cliConfig,
        ),
        cleanupOrphans: options.cleanupOrphans as boolean,
        cleanupSubfiles: options.cleanupSubfiles as boolean,
        ids: options.ids
          ? (options.ids as string)
              .split(",")
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0)
          : [],
        filterByTags: options.tags
          ? (options.tags as string)
              .split(",")
              .map((s: string) => s.trim())
              .filter((s: string) => s.length > 0)
          : [],
      };

      const executor = new ImportExecutor(ctx.workflowService, importOpts);
      executor.setProgressCallback(reportProgress);

      try {
        const result = await executor.execute();

        if (importOpts.dryRun) {
          reportDryRun(result);
        } else {
          reportSummary(result);
        }

        if (result.hasErrors()) {
          process.exit(1);
        }
      } catch (err) {
        console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
        process.exit(1);
      }
    });
}
