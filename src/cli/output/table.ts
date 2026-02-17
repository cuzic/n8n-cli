/**
 * Formats data as an aligned table with headers and rows.
 * Uses tab-based alignment similar to Go's tabwriter.
 */
export function formatTable(headers: string[], rows: string[][]): void {
  // Calculate column widths
  const colWidths = headers.map((h) => h.length);
  for (const row of rows) {
    for (let i = 0; i < row.length; i++) {
      const cell = row[i] ?? "";
      if (i < colWidths.length) {
        colWidths[i] = Math.max(colWidths[i] ?? 0, cell.length);
      }
    }
  }

  // Format and print header
  const headerLine = headers.map((h, i) => h.padEnd(colWidths[i] ?? 0)).join("  ");
  console.log(headerLine);

  // Format and print rows
  for (const row of rows) {
    const line = row.map((cell, i) => (cell ?? "").padEnd(colWidths[i] ?? 0)).join("  ");
    console.log(line);
  }
}

/** Formats data as key-value pairs in sorted order. */
export function formatKeyValue(pairs: Record<string, string>): void {
  const keys = Object.keys(pairs).sort();

  // Calculate max key width for alignment
  let maxKeyLen = 0;
  for (const key of keys) {
    const labelLen = `${key}:`.length;
    if (labelLen > maxKeyLen) {
      maxKeyLen = labelLen;
    }
  }

  for (const key of keys) {
    const label = `${key}:`.padEnd(maxKeyLen);
    console.log(`${label}  ${pairs[key]}`);
  }
}

/** Formats a simple message. */
export function formatMessage(message: string): void {
  console.log(message);
}

/** Formats an error message with optional hint. */
export function formatError(message: string, hint?: string): void {
  console.log(`Error: ${message}`);
  if (hint) {
    console.log(`Hint: ${hint}`);
  }
}
