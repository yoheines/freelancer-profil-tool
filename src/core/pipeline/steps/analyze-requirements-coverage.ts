import type { PipelineContext } from "../pipeline-context.js";
import type { RequirementsMap } from "../../../model/coverage/requirements-map.js";
import { buildRequirementsMapPrompt } from "../../../adapters/llm/prompt-builder/requirements-map-prompt.js";
import { normalizeRequirementsMap } from "../../../adapters/llm/response-normalizers/normalize-requirements-map.js";
import { createLlmClient } from "../../../adapters/llm/openai-compatible-client.js";
import type { SourceDocument } from "../../../model/input/job-posting-input.js";

export async function analyzeRequirementsCoverage(
  context: Pick<PipelineContext, "config" | "secrets">,
  postingText: string,
  steeringHints: string[],
  sources: SourceDocument[],
): Promise<{ requirementsMap: RequirementsMap; tokensUsed: number }> {
  const llm = createLlmClient(context.config.llm, context.secrets);
  const sourceDataJson = JSON.stringify(serializeSources(sources));
  const { systemPrompt, userPrompt } = buildRequirementsMapPrompt(
    postingText,
    steeringHints,
    sourceDataJson,
  );

  const result = await llm.callLlm({ systemPrompt, userPrompt, label: "analyze-requirements-coverage" });
  const requirementsMap = normalizeRequirementsMap(result.content);

  return { requirementsMap, tokensUsed: result.tokensUsed };
}

function serializeSources(sources: SourceDocument[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const source of sources) {
    if (source.type === "profile") {
      result.profile = source.content;
    } else if (source.type === "project-history") {
      result.projects = source.content;
    }
  }

  return result;
}
