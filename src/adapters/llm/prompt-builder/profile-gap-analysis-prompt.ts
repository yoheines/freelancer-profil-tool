import { loadPromptTemplate, fillTemplate } from "./load-prompt-template.js";
import { buildSteeringHintsSection } from "./prompt-sections.js";

export function buildProfileGapAnalysisPrompt(
  postingText: string,
  steeringHints: string[],
  sourceDataJson: string,
): { systemPrompt: string; userPrompt: string } {
  const template = loadPromptTemplate("06-gap-analysis-prompt");

  const jsonSchema = JSON.stringify({
    overallAssessment: "string",
    findings: [
      {
        requirement: "string",
        status: "unbelegt|schwach_gestuetzt|gut_belegt",
        reasoning: "string",
        suggestedEvidence: "string",
        suggestedSourceLocation: "summary|skills|certifications|languages|projektbeschreibung|workExperience|availability|capacity|onsiteWillingness|sonstiges",
        priority: "hoch|mittel|niedrig",
        gapPriority: "hoch|mittel|niedrig (optional, nur bei unbelegt/schwach_gestuetzt)",
      },
    ],
  }, null, 2);

  return {
    systemPrompt: fillTemplate(template.system_prompt, {
      GAP_ANALYSIS_JSON_SCHEMA: jsonSchema,
    }),
    userPrompt: fillTemplate(template.user_prompt, {
      POSTING_TEXT: postingText,
      STEERING_HINTS_SECTION: buildSteeringHintsSection(steeringHints),
      SOURCE_DATA_JSON: sourceDataJson,
    }),
  };
}
