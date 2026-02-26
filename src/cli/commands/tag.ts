import type { Command } from "commander";
import { registerTagCreateCommand } from "./tag-create.ts";
import { registerTagDeleteCommand } from "./tag-delete.ts";
import { registerTagGetCommand } from "./tag-get.ts";
import { registerTagListCommand } from "./tag-list.ts";
import { registerTagUpdateCommand } from "./tag-update.ts";

export function registerTagCommand(program: Command): void {
  const tag = program.command("tag").description("Manage n8n tags");
  registerTagListCommand(tag);
  registerTagGetCommand(tag);
  registerTagCreateCommand(tag);
  registerTagUpdateCommand(tag);
  registerTagDeleteCommand(tag);
}
