import { loadPromptTemplate, fillTemplate } from "./load-prompt-template.js";
import { buildSteeringHintsSection } from "./prompt-sections.js";

export function buildRequirementsMapPrompt(
  postingText: string,
  steeringHints: string[],
  sourceDataJson: string,
): { systemPrompt: string; userPrompt: string } {
  const template = loadPromptTemplate("01-requirements-map-prompt");

  const jsonSchema = JSON.stringify({
    entries: [
      {
        requirement: "string",
        priority: "hoch|mittel|niedrig",
        coverage: "gut_belegt|schwach_gestuetzt|unbelegt",
        evidenceType: "projekt|zertifikat|profil_skill|rolle|indirekt|keine",
        keyEvidence: "string (konkretes Zitat, leer bei unbelegt)",
      },
    ],
  }, null, 2);

  return {
    systemPrompt: fillTemplate(template.system_prompt, {
      JSON_SCHEMA: jsonSchema,
    }),
    userPrompt: fillTemplate(template.user_prompt, {
      POSTING_TEXT: postingText,
      STEERING_HINTS_SECTION: buildSteeringHintsSection(steeringHints),
      SOURCE_DATA_JSON: sourceDataJson,
    }),
  };
}
