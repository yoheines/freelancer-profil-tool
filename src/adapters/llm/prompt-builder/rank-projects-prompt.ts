/**
 * Baut den Prompt für das Ranking von Projekten nach Ausschreibungsrelevanz.
 * Lädt das Template aus prompts/03-rank-projects-prompt.yaml.
 */

import { loadPromptTemplate, fillTemplate } from "./load-prompt-template.js";
import type { RequirementsMap } from "../../../model/coverage/requirements-map.js";
import { buildRequirementsMapEntries, buildSteeringHintsSection } from "./prompt-sections.js";

interface ProjectInput {
  id: string;
  title: string;
  description: string;
  client?: string;
  industry?: string;
  duration?: string;
  skills?: string[];
}

export function buildRankProjectsPrompt(
  projects: ProjectInput[],
  postingText: string,
  steeringHints: string[],
  targetCount: number,
  requirementsMap?: RequirementsMap,
): { systemPrompt: string; userPrompt: string } {
  const template = loadPromptTemplate("03-rank-projects-prompt");

  const projectsJson = JSON.stringify(
    projects.map((p) => ({
      id: p.id,
      title: p.title,
      client: p.client,
      industry: p.industry,
      duration: p.duration,
      skills: p.skills,
      description: p.description,
    })),
    null,
    2,
  );

  const rankingJsonSchema = JSON.stringify({
    rankings: [
      {
        rank: 1,
        id: "proj-xyz",
        title: "Projekttitel",
        rationale: "Begründung auf Deutsch, 1-2 Sätze",
      },
    ],
  }, null, 2);

  return {
    systemPrompt: fillTemplate(template.system_prompt, {
      RANKING_JSON_SCHEMA: rankingJsonSchema,
      REQUIREMENTS_MAP_ENTRIES: buildRequirementsMapEntries(requirementsMap),
    }),
    userPrompt: fillTemplate(template.user_prompt, {
      POSTING_TEXT: postingText,
      STEERING_HINTS_SECTION: buildSteeringHintsSection(steeringHints),
      PROJECTS_JSON: projectsJson,
      PROJECT_COUNT: String(projects.length),
      TARGET_COUNT: String(targetCount),
    }),
  };
}
