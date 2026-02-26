import { createInterface } from "node:readline";
import type { Command } from "commander";
import { isAuthError, isNotFoundError } from "@/api/errors.ts";
import { resolveContext } from "@/cli/root.ts";

export function registerTagDeleteCommand(parent: Command): void {
  parent
    .command("delete")
    .description("Delete one or more tags")
    .argument("<ids...>", "One or more tag IDs to delete")
    .option("--force", "Skip confirmation prompt")
    .action(async (ids: string[], options, command) => {
      const ctx = resolveContext(command.parent?.parent!);

      if (!options.force) {
        const lines: string[] = [];
        for (const id of ids) {
          try {
            const tag = await ctx.tagService.getTag(id);
            lines.push(`  - ${tag.name} (${id})`);
          } catch (err) {
            if (isNotFoundError(err)) {
              console.error(`Error: tag not found: ${id}`);
              process.exit(1);
            }
            if (isAuthError(err)) {
              throw err;
            }
            lines.push(`  - ${id}`);
          }
        }

        console.log(`The following ${ids.length} tag(s) will be deleted:\n${lines.join("\n")}`);

        const confirmed = await confirmDelete("these tags");
        if (!confirmed) {
          console.log("Deletion cancelled");
          return;
        }
      }

      let succeeded = 0;
      let failed = 0;

      for (const id of ids) {
        try {
          await ctx.tagService.deleteTag(id);
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
