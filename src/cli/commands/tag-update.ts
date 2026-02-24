import type { Command } from "commander";
import type { Tag } from "@/api/types.ts";
import { formatJSON } from "@/cli/output/json.ts";
import { formatKeyValue } from "@/cli/output/table.ts";
import { resolveContext } from "@/cli/root.ts";

export function registerTagUpdateCommand(parent: Command): void {
  parent
    .command("update")
    .description("Update an existing tag")
    .argument("<id>", "Tag ID")
    .requiredOption("-n, --name <name>", "New tag name")
    .action(async (id: string, options, command) => {
      const ctx = resolveContext(command.parent?.parent!);
      const tag = await ctx.tagService.updateTag(id, { name: options.name as string });

      console.log("Tag updated successfully");
      outputTag(tag, ctx.config.output);
    });
}

function outputTag(tag: Tag, format: string): void {
  if (format === "table") {
    formatKeyValue({
      ID: tag.id ?? "-",
      Name: tag.name,
      Created: tag.createdAt ? tag.createdAt.slice(0, 19).replace("T", " ") : "-",
      Updated: tag.updatedAt ? tag.updatedAt.slice(0, 19).replace("T", " ") : "-",
    });
  } else {
    formatJSON(tag, true);
  }
}
