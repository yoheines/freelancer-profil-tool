/**
 * Baut den Prompt für die Batch-Adaption mehrerer Projektbeschreibungen.
 * Lädt das Template aus prompts/05-project-adaptation-prompt.yaml.
 */

import type { RequirementsMap } from "../../../model/coverage/requirements-map.js";
import type { ProjectSkillInput } from "../../../model/input/job-posting-input.js";
import { loadPromptTemplate, fillTemplate } from "./load-prompt-template.js";
import { buildRequirementsMapEntries, buildSteeringHintsSection } from "./prompt-sections.js";
import { serializeProjectSkillsForPrompt } from "../../../shared/skills/normalize-skill-names.js";

interface ProjectInput {
  id: string;
  title: string;
  description: string;
  skills?: ProjectSkillInput[];
  client?: string;
  industry?: string;
  duration?: string;
}

export function buildBatchProjectAdaptationPrompt(
  projects: ProjectInput[],
  postingText: string,
  steeringHints: string[],
  targetLanguage: string,
  requirementsMap?: RequirementsMap,
): { systemPrompt: string; userPrompt: string } {
  const template = loadPromptTemplate("05-project-adaptation-prompt");

  const projectsJson = JSON.stringify(
    projects.map((p, i) => ({
      index: i + 1,
      id: p.id,
      title: p.title,
      client: p.client,
      industry: p.industry,
      duration: p.duration,
      skills: serializeProjectSkillsForPrompt(p.skills),
      description: p.description,
    })),
    null,
    2,
  );

  const jsonSchema = JSON.stringify({
    adaptations: [
      {
        index: 1,
        id: "proj-xyz",
        adaptedText: "Der angepasste Text in 2-4 Sätzen.",
      },
    ],
  }, null, 2);

  return {
    systemPrompt: fillTemplate(template.system_prompt, {
      ADAPTATION_JSON_SCHEMA: jsonSchema,
      TARGET_LANGUAGE: targetLanguage,
      REQUIREMENTS_MAP_ENTRIES: buildRequirementsMapEntries(requirementsMap),
    }),
    userPrompt: fillTemplate(template.user_prompt, {
      POSTING_TEXT: postingText,
      STEERING_HINTS_SECTION: buildSteeringHintsSection(steeringHints),
      PROJECTS_JSON: projectsJson,
      PROJECT_COUNT: String(projects.length),
    }),
  };
}
