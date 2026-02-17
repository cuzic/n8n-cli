import type { Command } from "commander";
import { resolveContext } from "../root.ts";

export function registerActivateCommand(parent: Command): void {
  parent
    .command("activate")
    .description("Activate a workflow")
    .argument("<id>", "Workflow ID")
    .action(async (id: string, _options, command) => {
      const ctx = resolveContext(command.parent?.parent!);
      const workflow = await ctx.workflowService.activateWorkflow(id);

      if (workflow.active) {
        console.log(`Workflow ${workflow.name} (${workflow.id}) is now active`);
      } else {
        console.log(
          `Warning: Workflow ${workflow.name} (${workflow.id}) activation may have failed, status is: inactive`,
        );
      }
    });
}
