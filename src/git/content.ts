/** Git content retrieval errors */
export const ErrFileNotExist = new Error("file does not exist at ref");
export const ErrNotGitRepository = new Error("not a git repository");
export const ErrInvalidRef = new Error("invalid git ref");

/** ContentRetriever handles Git content retrieval operations. */
export class ContentRetriever {
  /**
   * GetFileAtRef retrieves the content of a file at a specific Git ref.
   * @param ref Git reference (e.g., "origin/main", "HEAD~3", commit hash)
   * @param filePath Path to the file relative to repository root
   * @returns File content as string
   */
  async getFileAtRef(ref: string, filePath: string): Promise<string> {
    const arg = `${ref}:${filePath}`;
    const proc = Bun.spawn(["git", "show", arg], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      if (stderr.includes("does not exist")) {
        throw ErrFileNotExist;
      }
      if (stderr.includes("not a git repository")) {
        throw ErrNotGitRepository;
      }
      if (
        stderr.includes("unknown revision") ||
        stderr.includes("bad revision") ||
        stderr.includes("ambiguous argument")
      ) {
        throw ErrInvalidRef;
      }
      throw new Error(`git show failed: ${stderr.trim()}`);
    }

    return stdout;
  }

  /** GetRepoRoot returns the absolute path to the Git repository root. */
  async getRepoRoot(): Promise<string> {
    const proc = Bun.spawn(["git", "rev-parse", "--show-toplevel"], {
      stdout: "pipe",
      stderr: "pipe",
    });

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      if (stderr.includes("not a git repository")) {
        throw ErrNotGitRepository;
      }
      throw new Error(`git rev-parse failed: ${stderr.trim()}`);
    }

    return stdout.trim();
  }
}
