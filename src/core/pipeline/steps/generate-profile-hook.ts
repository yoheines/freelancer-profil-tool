import type { PipelineContext } from "../pipeline-context.js";
import type { SourceDocument } from "../../../model/input/job-posting-input.js";
import type { RequirementsMap } from "../../../model/coverage/requirements-map.js";
import { buildProfileHookPrompt } from "../../../adapters/llm/prompt-builder/profile-hook-prompt.js";
import { normalizeProfileHook } from "../../../adapters/llm/response-normalizers/normalize-profile-hook.js";
import { createLlmClient } from "../../../adapters/llm/openai-compatible-client.js";
import { getProfileLanguageLabel } from "../../../shared/i18n/profile-language.js";

export async function generateProfileHook(
  context: PipelineContext,
  postingText: string,
  steeringHints: string[],
  sources: SourceDocument[],
  requirementsMap?: RequirementsMap,
): Promise<{ text: string; tokensUsed: number }> {
  const llm = createLlmClient(context.config.llm, context.secrets);

  // Roh-JSON der Quellen statt custom-formatierter Zusammenfassung
  const profileDataJson = JSON.stringify(sources, null, 2);

  const { systemPrompt, userPrompt } = buildProfileHookPrompt(
    postingText,
    steeringHints,
    profileDataJson,
    getProfileLanguageLabel(context.inputs.targetLanguage),
    requirementsMap,
  );

  const result = await llm.callLlm({ systemPrompt, userPrompt, label: "generate-profile-hook" });
  return {
    text: normalizeProfileHook(result.content),
    tokensUsed: result.tokensUsed,
  };
}
