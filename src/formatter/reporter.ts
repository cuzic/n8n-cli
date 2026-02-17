import type { PositionChange } from "./formatter.ts";

/** GenerateChangeReport generates a human-readable report of position changes */
export function generateChangeReport(filePath: string, changes: PositionChange[]): string {
  const lines: string[] = [];

  lines.push(`Changes for ${filePath}:`);

  if (changes.length === 0) {
    lines.push("  No changes needed");
    return `${lines.join("\n")}\n`;
  }

  lines.push(`  ${changes.length} node(s) will be repositioned:\n`);

  for (const change of changes) {
    lines.push(`  ${change.nodeName}:`);
    lines.push(
      `    [${change.oldPos[0]}, ${change.oldPos[1]}] → [${change.newPos[0]}, ${change.newPos[1]}]`,
    );
  }

  return `${lines.join("\n")}\n`;
}
