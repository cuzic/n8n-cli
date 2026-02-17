import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";

/**
 * Creates a js-yaml schema with a custom `!include` tag.
 * `!include` resolves file paths relative to the YAML file's directory
 * and returns file content as a string.
 */
export function createIncludeSchema(baseDir: string): yaml.Schema {
  const includeType = new yaml.Type("!include", {
    kind: "scalar",
    resolve(data: string): boolean {
      return typeof data === "string" && data.length > 0;
    },
    construct(data: string): string {
      const filePath = path.resolve(baseDir, data);
      try {
        return fs.readFileSync(filePath, "utf-8");
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`!include failed to read "${data}" (resolved to "${filePath}"): ${msg}`);
      }
    },
    represent(data: unknown): string {
      return String(data);
    },
  });

  return yaml.DEFAULT_SCHEMA.extend([includeType]);
}

/**
 * IncludeRef is a marker class for values that should be serialized as `!include` tags
 * when dumping YAML.
 */
export class IncludeRef {
  constructor(public readonly path: string) {}
}

/**
 * Creates a js-yaml schema for dumping YAML with `!include` tags.
 * IncludeRef instances are serialized as `!include <path>` scalars.
 */
export function createIncludeDumpSchema(): yaml.Schema {
  const includeRefType = new yaml.Type("!include", {
    kind: "scalar",
    instanceOf: IncludeRef,
    represent(data: unknown): string {
      return (data as IncludeRef).path;
    },
  });

  return yaml.DEFAULT_SCHEMA.extend([includeRefType]);
}
