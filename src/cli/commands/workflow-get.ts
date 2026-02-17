import type { Command } from "commander";
import type { Workflow } from "../../api/types.ts";
import { formatJSON } from "../output/json.ts";
import { formatKeyValue } from "../output/table.ts";
import { resolveContext } from "../root.ts";

export function registerGetCommand(parent: Command): void {
  parent
    .command("get")
    .description("Get a workflow by ID")
    .argument("<id>", "Workflow ID")
    .option("-f, --file <path>", "Output file path (writes JSON to file)")
    .action(async (id: string, options, command) => {
      const ctx = resolveContext(command.parent?.parent!);
      const workflow = await ctx.workflowService.getWorkflow(id);

      if (options.file) {
        await outputToFile(workflow, options.file as string);
        return;
      }

      outputWorkflow(workflow, ctx.config.output);
    });
}

function outputWorkflow(workflow: Workflow, format: string): void {
  if (format === "table") {
    const tags =
      workflow.tags && workflow.tags.length > 0 ? workflow.tags.map((t) => t.name).join(", ") : "-";

    formatKeyValue({
      ID: workflow.id ?? "-",
      Name: workflow.name,
      Active: workflow.active ? "Yes" : "No",
      Nodes: String(workflow.nodes?.length ?? 0),
      Tags: tags,
      Created: workflow.createdAt ? workflow.createdAt.slice(0, 19).replace("T", " ") : "-",
      Updated: workflow.updatedAt ? workflow.updatedAt.slice(0, 19).replace("T", " ") : "-",
    });
  } else {
    formatJSON(workflow, true);
  }
}

async function outputToFile(workflow: Workflow, filePath: string): Promise<void> {
  const data = JSON.stringify(workflow, null, 2);
  await Bun.write(filePath, `${data}\n`);
  console.log(`Workflow saved to ${filePath}`);
}
