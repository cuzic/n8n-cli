import type { Command } from "commander";
import type { CredentialSchema } from "@/api/credential-service.ts";
import { formatJSON } from "@/cli/output/json.ts";
import { formatTable } from "@/cli/output/table.ts";
import { resolveContext } from "@/cli/root.ts";

export function registerCredentialSchemaCommand(parent: Command): void {
  parent
    .command("schema")
    .description("Show credential type schema")
    .argument("<type>", "Credential type name (e.g., githubApi, googleApi)")
    .action(async (typeName: string, _options, command) => {
      const ctx = resolveContext(command.parent?.parent!);
      const schema = await ctx.credentialService.getCredentialSchema(typeName);

      outputSchema(schema, typeName, ctx.config.output);
    });
}

function outputSchema(schema: CredentialSchema, typeName: string, format: string): void {
  if (format === "table") {
    console.log(`Schema for credential type: ${typeName}\n`);

    const headers = ["PROPERTY", "TYPE", "REQUIRED", "DEFAULT", "DESCRIPTION"];
    const required = new Set(schema.required ?? []);
    const rows: string[][] = [];

    for (const [name, prop] of Object.entries(schema.properties)) {
      rows.push([
        name,
        prop.type,
        required.has(name) ? "yes" : "no",
        prop.default !== undefined ? String(prop.default) : "-",
        truncate(prop.description ?? "-", 40),
      ]);
    }

    if (rows.length > 0) {
      formatTable(headers, rows);
    } else {
      console.log("No properties defined.");
    }
  } else {
    formatJSON(schema, true);
  }
}

function truncate(s: string, maxLen: number): string {
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen - 3)}...`;
}
