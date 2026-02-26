import type { Command } from "commander";
import type { Tag } from "@/api/types.ts";
import { formatJSON } from "@/cli/output/json.ts";
import { formatTable } from "@/cli/output/table.ts";
import { resolveContext } from "@/cli/root.ts";

export function registerTagListCommand(parent: Command): void {
  parent
    .command("list")
    .description("List all tags")
    .option("-l, --limit <n>", "Maximum number of tags to return per page")
    .action(async (options, command) => {
      const ctx = resolveContext(command.parent?.parent!);

      const limit = options.limit ? Number.parseInt(options.limit as string, 10) : undefined;
      const tags = await ctx.tagService.listAllTags();

      const result = limit && limit > 0 ? tags.slice(0, limit) : tags;
      outputTags(result, ctx.config.output);
    });
}

function outputTags(tags: Tag[], format: string): void {
  if (format === "table") {
    console.log(`Found ${tags.length} tag(s)\n`);

    if (tags.length === 0) return;

    const headers = ["ID", "NAME", "CREATED", "UPDATED"];
    const rows = tags.map((t) => [
      t.id ?? "-",
      t.name,
      t.createdAt ? t.createdAt.slice(0, 19).replace("T", " ") : "-",
      t.updatedAt ? t.updatedAt.slice(0, 19).replace("T", " ") : "-",
    ]);
    formatTable(headers, rows);
  } else {
    formatJSON(tags, true);
  }
}
