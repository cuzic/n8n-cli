import type { Command } from "commander";
import { registerExecutionDeleteCommand } from "./execution-delete.ts";
import { registerExecutionGetCommand } from "./execution-get.ts";
import { registerExecutionListCommand } from "./execution-list.ts";
import { registerExecutionRetryCommand } from "./execution-retry.ts";
import { registerExecutionStopCommand } from "./execution-stop.ts";

export function registerExecutionCommand(program: Command): void {
  const exec = program.command("execution").description("Manage n8n executions");
  registerExecutionListCommand(exec);
  registerExecutionGetCommand(exec);
  registerExecutionDeleteCommand(exec);
  registerExecutionRetryCommand(exec);
  registerExecutionStopCommand(exec);
}
