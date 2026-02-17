import type { Execution } from "../api/execution-service.ts";
import { ExecutionStatus as ES, type ExecutionStatus } from "../api/execution-service.ts";
import type { Workflow } from "../api/types.ts";
import type { WorkflowInput } from "./detector.ts";
import type { TestResult } from "./executor.ts";
import { isTestSuccess } from "./executor.ts";

/** Reporter handles test result output formatting */
export class Reporter {
  constructor(private readonly writer: WritableStream | { write(s: string): void }) {}

  private write(s: string): void {
    if ("write" in this.writer && typeof this.writer.write === "function") {
      this.writer.write(s);
    }
  }

  /** Report outputs the test result */
  report(result: TestResult): void {
    this.write("\n");
    this.write(`Testing workflow: ${result.workflow.name} (${result.workflow.id})\n`);

    if (result.webhookNode) {
      this.write(`  Test webhook: ${result.webhookNode.name}\n`);
    }
    if (result.webhookURL) {
      this.write(`  URL: ${result.webhookURL}\n`);
    }

    // Dry run mode
    if (result.httpStatus === 0 && !result.error) {
      this.write("\n(dry-run mode - no request sent)\n");
      return;
    }

    this.write("\n");

    if (result.error) {
      this.reportError(result.error);
      return;
    }

    this.write("Sending POST request...\n");
    this.write(`  Status: ${result.httpStatus} ${httpStatusText(result.httpStatus)}\n`);

    if (result.httpResponse) {
      this.reportResponse(result.httpResponse);
    }

    if (result.execution) {
      this.write("\n");
      this.reportExecution(result.execution);
    }

    this.write(`\nCompleted in ${(result.durationMs / 1000).toFixed(2)}s\n`);

    if (isTestSuccess(result)) {
      this.write("\n✓ Test passed\n");
    } else {
      this.write("\n✗ Test failed\n");
    }
  }

  private reportError(err: Error): void {
    this.write(`Error: ${err.message}\n`);
    if ("hint" in err && typeof (err as { hint(): string }).hint === "function") {
      this.write(`\nHint:\n${(err as { hint(): string }).hint()}\n`);
    }
  }

  private reportResponse(body: string): void {
    try {
      const jsonData = JSON.parse(body);
      const pretty = JSON.stringify(jsonData, null, 2);
      this.write(`  Response:\n  ${pretty}\n`);
    } catch {
      const display = body.length > 500 ? `${body.slice(0, 500)}... (truncated)` : body;
      this.write(`  Response: ${display}\n`);
    }
  }

  private reportExecution(exec: Execution): void {
    this.write(`Execution: ${exec.id}\n`);
    this.write(`  Status: ${formatExecutionStatus(exec.status)}\n`);

    if (exec.data?.resultData?.error) {
      const execErr = exec.data.resultData.error;
      this.write(`  Error: ${execErr.message}\n`);
      if (execErr.node) {
        this.write(`  Failed node: ${execErr.node}\n`);
      }
      if (execErr.description) {
        this.write(`  Description: ${execErr.description}\n`);
      }
    }
  }

  /** ReportJSON outputs the test result as JSON */
  reportJSON(result: TestResult): void {
    const output: Record<string, unknown> = {
      workflow: {
        id: result.workflow.id,
        name: result.workflow.name,
        active: result.workflow.active,
      },
      webhookURL: result.webhookURL,
      httpStatus: result.httpStatus,
      duration: result.durationMs / 1000,
      success: isTestSuccess(result),
    };

    if (result.webhookNode) {
      output.webhookNode = result.webhookNode.name;
    }

    if (result.httpResponse) {
      try {
        output.response = JSON.parse(result.httpResponse);
      } catch {
        output.response = result.httpResponse;
      }
    }

    if (result.execution) {
      output.execution = {
        id: result.execution.id,
        status: result.execution.status,
      };
    }

    if (result.error) {
      output.error = result.error.message;
    }

    this.write(`${JSON.stringify(output, null, 2)}\n`);
  }

  /** ReportWorkflowInputs outputs the workflow input parameters */
  reportWorkflowInputs(workflow: Workflow, inputs: WorkflowInput[]): void {
    this.write(`\nWorkflow Inputs for "${workflow.name}":\n`);

    if (inputs.length === 0) {
      this.write("  No input parameters defined.\n");
      this.write("  (Workflow may not have an executeWorkflowTrigger node with workflowInputs)\n");
      return;
    }

    this.write("\n");
    this.write(`  ${"NAME".padEnd(20)} ${"TYPE".padEnd(10)} ${"REQUIRED".padEnd(8)}\n`);
    this.write(`  ${"-".repeat(20)} ${"-".repeat(10)} ${"-".repeat(8)}\n`);
    for (const input of inputs) {
      const required = input.required ? "Yes" : "No";
      this.write(`  ${input.name.padEnd(20)} ${input.type.padEnd(10)} ${required.padEnd(8)}\n`);
    }

    this.write("\nSample test command:\n");
    this.write(`  n8n-cli test ${workflow.id} -d '{\n`);
    for (let i = 0; i < inputs.length; i++) {
      const comma = i < inputs.length - 1 ? "," : "";
      const input = inputs[i]!;
      const sampleValue = getSampleValue(input.type);
      this.write(`    "${input.name}": ${sampleValue}${comma}\n`);
    }
    this.write("  }' --wait-execution\n");
  }

  /** ReportWorkflowInputsJSON outputs the workflow input parameters as JSON */
  reportWorkflowInputsJSON(workflow: Workflow, inputs: WorkflowInput[]): void {
    const output = {
      workflow: { id: workflow.id, name: workflow.name },
      inputs,
    };
    this.write(`${JSON.stringify(output, null, 2)}\n`);
  }
}

function getSampleValue(typeName: string): string {
  switch (typeName) {
    case "number":
      return "0";
    case "boolean":
      return "true";
    case "object":
      return "{}";
    case "array":
      return "[]";
    default:
      return '"value"';
  }
}

function formatExecutionStatus(status: ExecutionStatus): string {
  switch (status) {
    case ES.SUCCESS:
      return "success ✓";
    case ES.ERROR:
      return "error ✗";
    case ES.RUNNING:
      return "running...";
    case ES.WAITING:
      return "waiting...";
    case ES.CRASHED:
      return "crashed ✗";
    default:
      return status;
  }
}

function httpStatusText(code: number): string {
  const texts: Record<number, string> = {
    200: "OK",
    201: "Created",
    202: "Accepted",
    204: "No Content",
    400: "Bad Request",
    401: "Unauthorized",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    408: "Request Timeout",
    500: "Internal Server Error",
    502: "Bad Gateway",
    503: "Service Unavailable",
  };
  return texts[code] ?? "";
}

/** FormatWebhookURL returns a formatted webhook URL message for n8n UI */
export function formatWebhookURL(baseURL: string, workflowId: string): string {
  const url = baseURL.replace(/\/api\/v1$/, "").replace(/\/+$/, "");
  return `${url}/workflow/${workflowId}`;
}
