/** Formats data as JSON and writes to stdout. */
export function formatJSON(data: unknown, pretty = false): void {
  const output = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  console.log(output);
}

/** Formats an error as JSON and writes to stdout. */
export function formatError(code: string, message: string, hint?: string): void {
  const errData: Record<string, unknown> = {
    error: {
      code,
      message,
      ...(hint ? { hint } : {}),
    },
  };
  formatJSON(errData);
}
