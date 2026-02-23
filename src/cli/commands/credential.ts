import type { Command } from "commander";
import { registerCredentialCreateCommand } from "./credential-create.ts";
import { registerCredentialDeleteCommand } from "./credential-delete.ts";
import { registerCredentialListCommand } from "./credential-list.ts";
import { registerCredentialSchemaCommand } from "./credential-schema.ts";
import { registerCredentialUpdateCommand } from "./credential-update.ts";

export function registerCredentialCommand(program: Command): void {
  const cred = program.command("credential").description("Manage n8n credentials");
  registerCredentialListCommand(cred);
  registerCredentialCreateCommand(cred);
  registerCredentialUpdateCommand(cred);
  registerCredentialDeleteCommand(cred);
  registerCredentialSchemaCommand(cred);
}
