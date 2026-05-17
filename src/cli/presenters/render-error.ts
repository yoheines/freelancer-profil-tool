/**
 * Renders a user-friendly error message from a pipeline failure.
 */

import type { PipelineFailure } from "../../core/pipeline/pipeline-result.js";

export function renderError(result: PipelineFailure): string {
  const err = result.error;
  const lines: string[] = [
    `❌ Run ${result.runId} failed.`,
    ``,
    `  Code:    ${err.code}`,
    `  Message: ${err.message}`,
  ];

  if (err.details) {
    const detailLines = JSON.stringify(err.details, null, 2);
    lines.push(`  Details: ${detailLines}`);
  }

  // For PipelineStepError, show which step failed
  if ("step" in err && typeof (err as Record<string, unknown>).step === "string") {
    lines.push(`  Step:    ${(err as Record<string, unknown>).step as string}`);
  }

  lines.push("");
  return lines.join("\n");
}
