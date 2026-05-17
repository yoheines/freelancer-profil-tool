/**
 * Renders a human-readable summary of a successful pipeline run.
 */

import type { PipelineSuccess } from "../../core/pipeline/pipeline-result.js";

export function renderRunSummary(result: PipelineSuccess): string {
  return [
    `✅ Run ${result.runId} completed successfully.`,
    ``,
    `📄 Profile draft:  ${result.draftPath || "(not yet written)"}`,
    `📋 Intermediate:   ${result.intermediatePath || "(not yet written)"}`,
    `🔍 Diagnostics:    ${result.diagnosticsPath || "(not yet written)"}`,
    ``,
    result.summary,
  ].join("\n");
}
