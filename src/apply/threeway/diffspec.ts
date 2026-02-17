/** DiffSpec represents a parsed Git diff specification. */
export interface DiffSpec {
  baseRef: string;
  headRef: string;
  rawSpec: string;
  isTripleDot: boolean;
}

/**
 * Parses a Git diff specification string into a DiffSpec.
 * Supports both "A..B" (double dot - range) and "A...B" (triple dot - merge base) formats.
 */
export function parseDiffSpec(spec: string): DiffSpec {
  if (!spec) {
    throw new Error("empty diff spec");
  }

  // Try triple dot first (must check before double dot since "..." contains "..")
  const tripleIdx = spec.indexOf("...");
  if (tripleIdx !== -1) {
    const baseRef = spec.slice(0, tripleIdx).trim();
    const headRef = spec.slice(tripleIdx + 3).trim();

    if (!baseRef) {
      throw new Error(`invalid diff spec: empty base ref in "${spec}"`);
    }
    if (!headRef) {
      throw new Error(`invalid diff spec: empty head ref in "${spec}"`);
    }

    return { baseRef, headRef, rawSpec: spec, isTripleDot: true };
  }

  // Try double dot
  const doubleIdx = spec.indexOf("..");
  if (doubleIdx !== -1) {
    const baseRef = spec.slice(0, doubleIdx).trim();
    const headRef = spec.slice(doubleIdx + 2).trim();

    if (!baseRef) {
      throw new Error(`invalid diff spec: empty base ref in "${spec}"`);
    }
    if (!headRef) {
      throw new Error(`invalid diff spec: empty head ref in "${spec}"`);
    }

    return { baseRef, headRef, rawSpec: spec, isTripleDot: false };
  }

  throw new Error(`invalid diff spec format: "${spec}" (expected A..B or A...B)`);
}
