/**
 * Baut den Prompt für die Generierung des Profil-Aufhängers / der Einleitung.
 * Lädt das Template aus prompts/04-profile-hook-prompt.yaml.
 */

import type { RequirementsMap } from "../../../model/coverage/requirements-map.js";
import { loadPromptTemplate, fillTemplate } from "./load-prompt-template.js";
import { buildRequirementsMapEntries, buildSteeringHintsSection } from "./prompt-sections.js";

export function buildProfileHookPrompt(
  postingText: string,
  steeringHints: string[],
  profileDataJson: string,
  targetLanguage: string,
  requirementsMap?: RequirementsMap,
): { systemPrompt: string; userPrompt: string } {
  const template = loadPromptTemplate("04-profile-hook-prompt");

  return {
    systemPrompt: fillTemplate(template.system_prompt, {
      TARGET_LANGUAGE: targetLanguage,
      REQUIREMENTS_MAP_ENTRIES: buildRequirementsMapEntries(requirementsMap),
    }),
    userPrompt: fillTemplate(template.user_prompt, {
      POSTING_TEXT: postingText,
      STEERING_HINTS_SECTION: buildSteeringHintsSection(steeringHints),
      PROFILE_DATA_JSON: profileDataJson,
    }),
  };
}
