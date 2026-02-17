declare const CLI_VERSION: string;
declare const CLI_GIT_COMMIT: string;
declare const CLI_BUILD_DATE: string;

const version = typeof CLI_VERSION !== "undefined" ? CLI_VERSION : "dev";
const gitCommit = typeof CLI_GIT_COMMIT !== "undefined" ? CLI_GIT_COMMIT : "unknown";
const buildDate = typeof CLI_BUILD_DATE !== "undefined" ? CLI_BUILD_DATE : "unknown";

export function runVersion(): void {
  console.log(`n8n-cli version ${version}`);
  console.log(`  Git commit: ${gitCommit}`);
  console.log(`  Built:      ${buildDate}`);
  console.log(`  Runtime:    Bun ${Bun.version}`);
  console.log(`  OS/Arch:    ${process.platform}/${process.arch}`);
}
