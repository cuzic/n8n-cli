import type { Command } from "commander";
import type { Tag } from "@/api/types.ts";
import { formatJSON } from "@/cli/output/json.ts";
import { formatKeyValue } from "@/cli/output/table.ts";
import { resolveContext } from "@/cli/root.ts";

export function registerTagCreateCommand(parent: Command): void {
  parent
    .command("create")
    .description("Create a new tag")
    .argument("<name>", "Tag name")
    .action(async (name: string, _options, command) => {
      const ctx = resolveContext(command.parent?.parent!);
      const tag = await ctx.tagService.createTag({ name });

      console.log("Tag created successfully");
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
