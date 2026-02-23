import type { Command } from "commander";
import { formatJSON } from "@/cli/output/json.ts";
import { formatKeyValue } from "@/cli/output/table.ts";
import { resolveContext } from "@/cli/root.ts";

export function registerCredentialDeleteCommand(parent: Command): void {
  parent
    .command("delete")
    .description("Delete a credential by ID")
    .argument("<id>", "Credential ID")
    .action(async (id: string, _options, command) => {
      const ctx = resolveContext(command.parent?.parent!);
      const credential = await ctx.credentialService.deleteCredential(id);

      if (ctx.config.output === "table") {
        formatKeyValue({
          ID: credential.id,
          Name: credential.name,
          Type: credential.type,
          Status: "deleted",
        });
        console.log("\nCredential deleted successfully.");
      } else {
        formatJSON(credential, true);
      }
    });
}
