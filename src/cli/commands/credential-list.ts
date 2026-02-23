import type { Command } from "commander";
import type { Credential } from "@/api/credential-service.ts";
import { formatJSON } from "@/cli/output/json.ts";
import { formatTable } from "@/cli/output/table.ts";
import { resolveContext } from "@/cli/root.ts";

export function registerCredentialListCommand(parent: Command): void {
  parent
    .command("list")
    .description("List credentials")
    .option("-l, --limit <n>", "Maximum number of credentials to return", "100")
    .action(async (options, command) => {
      const ctx = resolveContext(command.parent?.parent!);

      const limit = Number.parseInt(options.limit as string, 10);
      const opts: { limit?: number } = {};

      if (limit > 0) {
        opts.limit = limit;
      }

      const response = await ctx.credentialService.listCredentials(opts);
      outputCredentials(response.data, ctx.config.output);
    });
}

function outputCredentials(credentials: Credential[], format: string): void {
  if (format === "table") {
    console.log(`Found ${credentials.length} credential(s)\n`);

    if (credentials.length === 0) return;

    const headers = ["ID", "NAME", "TYPE", "CREATED", "UPDATED"];
    const rows = credentials.map((c) => [
      c.id,
      c.name,
      c.type,
      c.createdAt ? c.createdAt.slice(0, 19).replace("T", " ") : "-",
      c.updatedAt ? c.updatedAt.slice(0, 19).replace("T", " ") : "-",
    ]);
    formatTable(headers, rows);
  } else {
    formatJSON(credentials, true);
  }
}
