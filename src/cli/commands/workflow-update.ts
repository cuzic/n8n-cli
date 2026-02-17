import type { Command } from "commander";
import type { Workflow } from "../../api/types.ts";
import { readWorkflowInput } from "../../input/reader.ts";
import { formatJSON } from "../output/json.ts";
import { formatKeyValue } from "../output/table.ts";
import { resolveContext } from "../root.ts";

export function registerUpdateCommand(parent: Command): void {
  parent
    .command("update")
    .description("Update an existing workflow")
    .argument("[id]", "Workflow ID (optional if JSON file contains 'id' field)")
    .requiredOption("-f, --file <path>", "Path to workflow JSON file (use - for stdin)")
    .option("--force", "Force update even if remote has been modified")
    .action(async (id: string | undefined, options, command) => {
      const ctx = resolveContext(command.parent?.parent!);

      const input = await readWorkflowInput(options.file as string);

      // Resolve workflow ID: argument > file content
      let workflowID = id;
      if (!workflowID) {
        // Try to get ID from the raw file data
        const rawData = await readRawID(options.file as string);
        if (!rawData) {
          console.error(
            "Error: workflow ID is required: specify as argument or include 'id' field in the JSON file",
          );
          process.exit(1);
        }
        workflowID = rawData;
        console.log(`Using workflow ID from file: ${workflowID}`);
      }

      const workflow = await ctx.workflowService.updateWorkflow(workflowID!, input);

      console.log(`Workflow ${workflow.name} (${workflow.id}) updated successfully`);
      outputWorkflow(workflow, ctx.config.output);
    });
}

async function readRawID(filename: string): Promise<string | undefined> {
  if (filename === "-" || filename === "") return undefined;
  try {
    const text = await Bun.file(filename).text();
    const parsed = JSON.parse(text) as { id?: string };
    return parsed.id || undefined;
  } catch {
    return undefined;
  }
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
