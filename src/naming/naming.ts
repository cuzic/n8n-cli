import path from "node:path";

/** Double underscore separator used between name and workflow ID in filenames. */
export const ID_SEPARATOR = "__";

/**
 * Extracts the workflow ID from a filename that uses the naming convention.
 * Format: {name}__{workflowID}.{ext}
 * Returns [id, true] if found, or ["", false] if the filename doesn't match.
 */
export function extractWorkflowIDFromFilename(filename: string): [string, boolean] {
  const base = path.basename(filename);
  const ext = path.extname(base);
  const nameWithID = base.slice(0, base.length - ext.length);

  const lastSepIndex = nameWithID.lastIndexOf(ID_SEPARATOR);
  if (lastSepIndex === -1) {
    return ["", false];
  }

  const id = nameWithID.slice(lastSepIndex + ID_SEPARATOR.length);
  if (id === "") {
    return ["", false];
  }

  return [id, true];
}

/**
 * Generates a filename with the workflow ID embedded.
 * Format: {sanitizedName}__{workflowID}{ext}
 */
export function generateFilenameWithID(
  sanitizedName: string,
  workflowID: string,
  ext: string,
): string {
  return `${sanitizedName}${ID_SEPARATOR}${workflowID}${ext}`;
}

/**
 * Extracts the workflow ID from a directory name that uses the naming convention.
 * Format: {name}__{workflowID}
 * Returns [id, true] if found, or ["", false] if the directory doesn't match.
 */
export function extractWorkflowIDFromDirname(dirname: string): [string, boolean] {
  const base = path.basename(dirname);

  const lastSepIndex = base.lastIndexOf(ID_SEPARATOR);
  if (lastSepIndex === -1) {
    return ["", false];
  }

  const id = base.slice(lastSepIndex + ID_SEPARATOR.length);
  if (id === "") {
    return ["", false];
  }

  return [id, true];
}

/**
 * Generates a directory name with the workflow ID embedded.
 * Format: {sanitizedName}__{workflowID}
 */
export function generateDirnameWithID(sanitizedName: string, workflowID: string): string {
  return `${sanitizedName}${ID_SEPARATOR}${workflowID}`;
}
