import type { Command } from "commander";
import type { Workflow } from "../../api/types.ts";
import type { ListOptions } from "../../api/workflow-service.ts";
import { formatJSON } from "../output/json.ts";
import { formatTable } from "../output/table.ts";
import { resolveContext } from "../root.ts";

export function registerListCommand(parent: Command): void {
  parent
    .command("list")
    .description("List all workflows")
    .option("--active", "List only active workflows")
    .option("--inactive", "List only inactive workflows")
    .option("--tags <tags>", "Filter by tags (comma-separated)")
    .option("--limit <n>", "Maximum number of workflows to return (0 = all)", "0")
    .action(async (options, command) => {
      if (options.active && options.inactive) {
        console.error("Error: cannot use --active and --inactive together");
        process.exit(1);
      }

      const ctx = resolveContext(command.parent?.parent!);

      const opts: ListOptions = {};
      if (options.active) {
        opts.active = true;
      } else if (options.inactive) {
        opts.active = false;
      }

      if (options.tags) {
        opts.tags = (options.tags as string)
          .split(",")
          .map((t: string) => t.trim())
          .filter((t: string) => t.length > 0);
      }

      const limit = Number.parseInt(options.limit as string, 10);
      if (limit > 0) {
        opts.limit = limit;
      }

      const workflows =
        limit > 0
          ? (await ctx.workflowService.listWorkflows(opts)).data
          : await ctx.workflowService.listAllWorkflows(opts);

      outputWorkflows(workflows, ctx.config.output);
    });
}

function outputWorkflows(workflows: Workflow[], format: string): void {
  if (format === "table") {
    console.log(`Found ${workflows.length} workflow(s)\n`);

    if (workflows.length === 0) return;

    const headers = ["ID", "NAME", "ACTIVE", "CREATED", "UPDATED"];
    const rows = workflows.map((w) => [
      w.id ?? "-",
      truncate(w.name, 40),
      w.active ? "Yes" : "No",
      w.createdAt ? w.createdAt.slice(0, 10) : "-",
      w.updatedAt ? w.updatedAt.slice(0, 10) : "-",
    ]);
    formatTable(headers, rows);
  } else {
    formatJSON(workflows, true);
  }
}

function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 3)}...`;
}
