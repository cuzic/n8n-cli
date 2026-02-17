import type { Command } from "commander";
import type { Workflow } from "../../api/types.ts";
import { readWorkflowInput } from "../../input/reader.ts";
import { formatJSON } from "../output/json.ts";
import { formatKeyValue } from "../output/table.ts";
import { resolveContext } from "../root.ts";

export function registerCreateCommand(parent: Command): void {
  parent
    .command("create")
    .description("Create a new workflow")
    .requiredOption("-f, --file <path>", "Path to workflow JSON file (use - for stdin)")
    .action(async (options, command) => {
      const ctx = resolveContext(command.parent?.parent!);

      const input = await readWorkflowInput(options.file as string);
      const workflow = await ctx.workflowService.createWorkflow(input);

      console.log("Workflow created successfully");
      outputWorkflow(workflow, ctx.config.output);
    });
}

function outputWorkflow(workflow: Workflow, format: string): void {
  if (format === "table") {
    formatKeyValue({
      ID: workflow.id ?? "-",
      Name: workflow.name,
      Active: workflow.active ? "Yes" : "No",
      Nodes: String(workflow.nodes?.length ?? 0),
      Created: workflow.createdAt ? workflow.createdAt.slice(0, 19).replace("T", " ") : "-",
      Updated: workflow.updatedAt ? workflow.updatedAt.slice(0, 19).replace("T", " ") : "-",
    });
  } else {
    formatJSON(workflow, true);
  }
}
