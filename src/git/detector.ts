import path from "node:path";

/** Detector handles Git diff operations for detecting changed workflow files. */
export class Detector {
  /**
   * GetChangedFiles detects workflow-related files changed in the specified Git diff range.
   * @param diffSpec Git diff specification (e.g., "origin/main..HEAD")
   * @param dir Target directory to filter changes (e.g., "./definitions")
   * @returns List of changed workflow-related file paths relative to repository root.
   */
  async getChangedFiles(diffSpec: string, dir = ""): Promise<string[]> {
    const output = await this.executeGitDiff(diffSpec, dir);
    const lines = output
      .trim()
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l !== "");

    return filterWorkflowRelatedFiles(lines);
  }

  /**
   * executeGitDiff runs the git diff command and returns stdout.
   */
  private async executeGitDiff(diffSpec: string, dir: string): Promise<string> {
    // core.quotePath=false prevents Git from escaping non-ASCII characters
    const args = ["-c", "core.quotePath=false", "diff", "--name-only", diffSpec];

    if (dir) {
      // Normalize path separator for git (always use forward slash)
      const normalizedDir = dir.split(path.sep).join("/");
      args.push("--", normalizedDir);
    }

    const proc = Bun.spawn(["git", ...args], {
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
        throw new Error(
          "git diff failed: not a git repository (or any of the parent directories): .git",
        );
      }
      throw new Error(`git diff failed: ${stderr.trim()}`);
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
        throw new Error("not a git repository");
      }
      throw new Error(`git rev-parse failed: ${stderr.trim()}`);
    }

    return stdout.trim();
  }
}

/** filterJSONFiles filters a list of file paths to only include .json files. */
export function filterJSONFiles(files: string[]): string[] {
  return files.filter((f) => f.toLowerCase().endsWith(".json"));
}

/**
 * filterWorkflowRelatedFiles filters a list of file paths to include workflow-related files.
 * This includes .json/.yaml/.yml files and files under _subfiles/ directory.
 */
export function filterWorkflowRelatedFiles(files: string[]): string[] {
  return files.filter((file) => {
    const ext = path.extname(file).toLowerCase();

    // Workflow definition files
    if (ext === ".json" || ext === ".yaml" || ext === ".yml") {
      return true;
    }

    // External files under _subfiles/ directory
    const normalizedPath = file.split(path.sep).join("/");
    return normalizedPath.includes("/_subfiles/");
  });
}
