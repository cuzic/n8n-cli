import type { Command } from "commander";
import { registerActivateCommand } from "./workflow-activate.ts";
import { registerCreateCommand } from "./workflow-create.ts";
import { registerDeactivateCommand } from "./workflow-deactivate.ts";
import { registerDeleteCommand } from "./workflow-delete.ts";
import { registerGetCommand } from "./workflow-get.ts";
import { registerListCommand } from "./workflow-list.ts";
import { registerUpdateCommand } from "./workflow-update.ts";

export function registerWorkflowCommand(program: Command): void {
  const wf = program.command("workflow").description("Manage n8n workflows");
  registerListCommand(wf);
  registerGetCommand(wf);
  registerCreateCommand(wf);
  registerUpdateCommand(wf);
  registerDeleteCommand(wf);
  registerActivateCommand(wf);
  registerDeactivateCommand(wf);
}
