import type { Command } from "commander";
import { formatJSON } from "@/cli/output/json.ts";
import { formatKeyValue } from "@/cli/output/table.ts";
import { resolveContext } from "@/cli/root.ts";

export function registerExecutionStopCommand(parent: Command): void {
  parent
    .command("stop")
    .description("Stop a running execution")
    .argument("<id>", "Execution ID")
    .action(async (id: string, _options, command) => {
      const ctx = resolveContext(command.parent?.parent!);
      const execution = await ctx.executionService.stopExecution(id);

      if (ctx.config.output === "table") {
        formatKeyValue({
          ID: execution.id,
          "Workflow ID": execution.workflowId,
          Status: execution.status,
          Stopped: execution.stoppedAt ?? "-",
        });
        console.log("\nExecution stopped.");
      } else {
        formatJSON(execution, true);
      }
    });
}
