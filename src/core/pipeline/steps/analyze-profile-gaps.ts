import type { PipelineContext } from "../pipeline-context.js";
import type { SourceDocument } from "../../../model/input/job-posting-input.js";
import type { ProfileGapAnalysis } from "../../../model/review/profile-gap-analysis.js";
import { createLlmClient } from "../../../adapters/llm/openai-compatible-client.js";
import { buildProfileGapAnalysisPrompt } from "../../../adapters/llm/prompt-builder/profile-gap-analysis-prompt.js";
import { normalizeProfileGapAnalysis } from "../../../adapters/llm/response-normalizers/normalize-profile-gap-analysis.js";

export async function analyzeProfileGaps(
  context: PipelineContext,
  postingText: string,
  steeringHints: string[],
  sources: SourceDocument[],
): Promise<{ gapAnalysis: ProfileGapAnalysis; tokensUsed: number }> {
  const llm = createLlmClient(context.config.llm, context.secrets);
  const sourceDataJson = JSON.stringify(sources, null, 2);
  const { systemPrompt, userPrompt } = buildProfileGapAnalysisPrompt(
    postingText,
    steeringHints,
    sourceDataJson,
  );

  const result = await llm.callLlm({ systemPrompt, userPrompt, label: "analyze-profile-gaps" });
  return {
    gapAnalysis: normalizeProfileGapAnalysis(result.content),
    tokensUsed: result.tokensUsed,
  };
}
