import type { Command } from "commander";
import type { Workflow } from "@/api/types.ts";
import { loadLintConfig } from "@/lint/config.ts";
import { formatJSON } from "@/lint/output/json.ts";
import type { LintResult } from "@/lint/output/result.ts";
import { hasErrors } from "@/lint/output/result.ts";
import { formatText } from "@/lint/output/text.ts";
import { registerDefaultRules } from "@/lint/rules/index.ts";
import { loadLintFile, scanFiles } from "@/lint/scanner.ts";

/** Registers the lint command on the program */
export function registerLintCommand(program: Command): void {
  program
    .command("lint")
    .description("Lint workflow definition files")
    .option("-d, --dir <directory>", "Directory to scan for workflow files")
    .option("-f, --file <files...>", "Specific files to lint (can be repeated)")
    .option("-c, --config <path>", "Path to .n8nlintrc.json config file")
    .option("--disable-rule <rules...>", "Disable specific rules (can be repeated)")
    .option("--list-rules", "List all available rules and exit")
    .option("-o, --output <format>", "Output format: text, json", "text")
    .action(async (opts) => {
      const registry = registerDefaultRules();

      // List rules mode
      if (opts.listRules) {
        const rules = registry.all();
        for (const rule of rules) {
          console.log(`  ${rule.name} (${rule.defaultSeverity}): ${rule.description}`);
        }
        return;
      }

      // Load config
      const config = opts.config ? loadLintConfig(opts.config) : loadLintConfig();

      // Get enabled rules
      const enabledRules = registry.enabledRulesWithConfig(config, opts.disableRule);

      // Collect files to lint
      let files: string[] = [];
      if (opts.file) {
        files = opts.file;
      } else if (opts.dir) {
        files = scanFiles(opts.dir);
      } else {
        console.error("Error: specify --dir or --file to indicate files to lint");
        process.exit(1);
      }

      if (files.length === 0) {
        console.error("No files found to lint");
        process.exit(1);
      }

      // Run linting
      const result: LintResult = {
        violations: [],
        filesChecked: 0,
        filesFailed: 0,
      };

      const failedFiles = new Set<string>();

      for (const filePath of files) {
        result.filesChecked++;

        let rawJSON: string;
        let workflow: Workflow | null = null;
        try {
          const loaded = await loadLintFile(filePath);
          rawJSON = loaded.rawJSON;
          workflow = loaded.workflow;
        } catch (e) {
          result.violations.push({
            file: filePath,
            rule: "file-read",
            severity: "error",
            message: `Failed to read file: ${e instanceof Error ? e.message : String(e)}`,
          });
          failedFiles.add(filePath);
          continue;
        }

        // Run each enabled rule
        for (const { rule, severity } of enabledRules) {
          const violations = rule.check(workflow, rawJSON);
          for (const v of violations) {
            result.violations.push({
              ...v,
              file: v.file ?? filePath,
              severity,
            });
            failedFiles.add(filePath);
          }
        }
      }

      result.filesFailed = failedFiles.size;

      // Output results
      const outputFormat = opts.output ?? "text";
      if (outputFormat === "json") {
        console.log(formatJSON(result));
      } else {
        console.log(formatText(result));
      }

      // Exit with error code if there are errors
      if (hasErrors(result)) {
        process.exit(1);
      }
    });
}
