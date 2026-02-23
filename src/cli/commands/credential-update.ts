import * as fs from "node:fs";
import type { Command } from "commander";
import type { UpdateCredentialRequest } from "@/api/credential-service.ts";
import { formatJSON } from "@/cli/output/json.ts";
import { formatKeyValue } from "@/cli/output/table.ts";
import { resolveContext } from "@/cli/root.ts";

export function registerCredentialUpdateCommand(parent: Command): void {
  parent
    .command("update")
    .description("Update an existing credential")
    .argument("<id>", "Credential ID")
    .option("-n, --name <name>", "New credential name")
    .option("-t, --type <type>", "New credential type")
    .option("-d, --data <json>", "New credential data as JSON string")
    .option("-f, --file <path>", "Read new credential data from JSON file")
    .action(async (id: string, options, command) => {
      const ctx = resolveContext(command.parent?.parent!);

      const req: UpdateCredentialRequest = {};

      if (options.name) {
        req.name = options.name as string;
      }

      if (options.type) {
        req.type = options.type as string;
      }

      // Get credential data from --data or --file
      if (options.file) {
        const content = fs.readFileSync(options.file as string, "utf-8");
        req.data = JSON.parse(content) as Record<string, unknown>;
      } else if (options.data) {
        req.data = JSON.parse(options.data as string) as Record<string, unknown>;
      }

      if (Object.keys(req).length === 0) {
        console.error("Error: At least one of --name, --type, --data, or --file must be provided");
        process.exit(1);
      }

      const credential = await ctx.credentialService.updateCredential(id, req);

      if (ctx.config.output === "table") {
        formatKeyValue({
          ID: credential.id,
          Name: credential.name,
          Type: credential.type,
          Updated: credential.updatedAt ?? "-",
        });
        console.log("\nCredential updated successfully.");
      } else {
        formatJSON(credential, true);
      }
    });
}
