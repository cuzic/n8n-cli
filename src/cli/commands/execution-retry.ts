import type { Command } from "commander";
import { formatJSON } from "@/cli/output/json.ts";
import { formatKeyValue } from "@/cli/output/table.ts";
import { resolveContext } from "@/cli/root.ts";

export function registerExecutionRetryCommand(parent: Command): void {
  parent
    .command("retry")
    .description("Retry a failed execution")
    .argument("<id>", "Execution ID")
    .action(async (id: string, _options, command) => {
      const ctx = resolveContext(command.parent?.parent!);
      const execution = await ctx.executionService.retryExecution(id);

      if (ctx.config.output === "table") {
        formatKeyValue({
          "Original ID": id,
          "New Execution ID": execution.id,
          "Workflow ID": execution.workflowId,
          Status: execution.status,
        });
        console.log("\nExecution retry started.");
      } else {
        formatJSON(execution, true);
      }
    });
}
