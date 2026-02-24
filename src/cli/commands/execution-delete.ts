import type { Command } from "commander";
import { formatJSON } from "@/cli/output/json.ts";
import { formatKeyValue } from "@/cli/output/table.ts";
import { resolveContext } from "@/cli/root.ts";

export function registerExecutionDeleteCommand(parent: Command): void {
  parent
    .command("delete")
    .description("Delete an execution by ID")
    .argument("<id>", "Execution ID")
    .action(async (id: string, _options, command) => {
      const ctx = resolveContext(command.parent?.parent!);
      const execution = await ctx.executionService.deleteExecution(id);

      if (ctx.config.output === "table") {
        formatKeyValue({
          ID: execution.id,
          "Workflow ID": execution.workflowId,
          Status: execution.status,
        });
        console.log("\nExecution deleted successfully.");
      } else {
        formatJSON(execution, true);
      }
    });
}
