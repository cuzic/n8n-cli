import * as fs from "node:fs";
import type { Command } from "commander";
import type { CreateCredentialRequest } from "@/api/credential-service.ts";
import { formatJSON } from "@/cli/output/json.ts";
import { formatKeyValue } from "@/cli/output/table.ts";
import { resolveContext } from "@/cli/root.ts";

export function registerCredentialCreateCommand(parent: Command): void {
  parent
    .command("create")
    .description("Create a new credential")
    .requiredOption("-n, --name <name>", "Credential name")
    .requiredOption("-t, --type <type>", "Credential type (e.g., githubApi, googleApi)")
    .option("-d, --data <json>", "Credential data as JSON string")
    .option("-f, --file <path>", "Read credential data from JSON file")
    .action(async (options, command) => {
      const ctx = resolveContext(command.parent?.parent!);

      // Get credential data from --data or --file
      let data: Record<string, unknown>;
      if (options.file) {
        const content = fs.readFileSync(options.file as string, "utf-8");
        data = JSON.parse(content) as Record<string, unknown>;
      } else if (options.data) {
        data = JSON.parse(options.data as string) as Record<string, unknown>;
      } else {
        console.error("Error: Either --data or --file must be provided");
        process.exit(1);
      }

      const req: CreateCredentialRequest = {
        name: options.name as string,
        type: options.type as string,
        data,
      };

      const credential = await ctx.credentialService.createCredential(req);

      if (ctx.config.output === "table") {
        formatKeyValue({
          ID: credential.id,
          Name: credential.name,
          Type: credential.type,
          Created: credential.createdAt ?? "-",
        });
        console.log("\nCredential created successfully.");
      } else {
        formatJSON(credential, true);
      }
    });
}
