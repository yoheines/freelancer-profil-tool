/**
 * Renders a human-readable summary of a successful pipeline run.
 */

import type { PipelineSuccess } from "../../core/pipeline/pipeline-result.js";

export function renderRunSummary(result: PipelineSuccess): string {
  return [
    `✅ Run ${result.runId} completed successfully.`,
    `  ${result.summary}`,
    ``,
    `  📄 YAML:     ${result.draftPath || "(not yet written)"}`,
    `  📋 Meta:     ${result.metaPath || "(not yet written)"}`,
  ].join("\n");
}
