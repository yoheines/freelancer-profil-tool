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
        reasoning: "string (kurze Begründung der Bewertung)",
        suggestedEvidence: "string (konkreter Verbesserungshinweis, leer falls gut belegt)",
        suggestedSourceLocation: "summary|skills|certifications|languages|projektbeschreibung|workExperience|availability|capacity|onsiteWillingness|sonstiges (leer falls gut belegt)",
        gapPriority: "hoch|mittel|niedrig (optional, nur bei unbelegt/schwach_gestuetzt)",
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
