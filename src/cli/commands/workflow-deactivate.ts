import type { Command } from "commander";
import { resolveContext } from "../root.ts";

export function registerDeactivateCommand(parent: Command): void {
  parent
    .command("deactivate")
    .description("Deactivate a workflow")
    .argument("<id>", "Workflow ID")
    .action(async (id: string, _options, command) => {
      const ctx = resolveContext(command.parent?.parent!);
      const workflow = await ctx.workflowService.deactivateWorkflow(id);

      if (!workflow.active) {
        console.log(`Workflow ${workflow.name} (${workflow.id}) is now inactive`);
      } else {
        console.log(
          `Warning: Workflow ${workflow.name} (${workflow.id}) deactivation may have failed, status is: active`,
        );
      }
    });
}
