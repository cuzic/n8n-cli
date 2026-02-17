import { createInterface } from "node:readline";
import type { Command } from "commander";
import { isAuthError, isNotFoundError } from "../../api/errors.ts";
import { resolveContext } from "../root.ts";

export function registerDeleteCommand(parent: Command): void {
  parent
    .command("delete")
    .description("Delete one or more workflows")
    .argument("<ids...>", "One or more workflow IDs to delete")
    .option("--force", "Skip confirmation prompt")
    .action(async (ids: string[], options, command) => {
      const ctx = resolveContext(command.parent?.parent!);

      if (!options.force) {
        // Fetch workflow names for confirmation display
        const lines: string[] = [];
        for (const id of ids) {
          try {
            const workflow = await ctx.workflowService.getWorkflow(id);
            lines.push(`  - ${workflow.name} (${id})`);
          } catch (err) {
            if (isNotFoundError(err)) {
              console.error(`Error: workflow not found: ${id}`);
              process.exit(1);
            }
            if (isAuthError(err)) {
              throw err;
            }
            lines.push(`  - ${id}`);
          }
        }

        console.log(
          `The following ${ids.length} workflow(s) will be deleted:\n${lines.join("\n")}`,
        );

        const confirmed = await confirmDelete("these workflows");
        if (!confirmed) {
          console.log("Deletion cancelled");
          return;
        }
      }

      let succeeded = 0;
      let failed = 0;

      for (const id of ids) {
        try {
          await ctx.workflowService.deleteWorkflow(id);
          console.log(`Deleted: ${id}`);
          succeeded++;
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error(`Error deleting ${id}: ${msg}`);
          failed++;
        }
      }

      console.log(`\nSummary: ${succeeded} succeeded, ${failed} failed (of ${ids.length} total)`);

      if (failed > 0) {
        process.exit(1);
      }
    });
}

function confirmDelete(name: string): Promise<boolean> {
  return new Promise((resolve) => {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(`Are you sure you want to delete ${name}? [y/N]: `, (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      resolve(trimmed === "y" || trimmed === "yes");
    });
  });
}
