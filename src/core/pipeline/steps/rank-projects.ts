/**
 * Schritt: Projekt-Ranking per LLM.
 * Der LLM bekommt alle Projekte + Anforderungen und wählt die relevantesten aus,
 * sortiert nach Relevanz für die Ausschreibung – rein LLM-basiert, ohne
 * regelbasierte Evidenz-Kalkulation oder Reserve-Klassifikation.
 */

import type { PipelineContext } from "../pipeline-context.js";
import type { SourceDocument } from "../../../model/input/job-posting-input.js";
import type { RequirementsMap } from "../../../model/coverage/requirements-map.js";
import { createLlmClient } from "../../../adapters/llm/openai-compatible-client.js";
import { buildRankProjectsPrompt } from "../../../adapters/llm/prompt-builder/rank-projects-prompt.js";
import { normalizeProjectRanking } from "../../../adapters/llm/response-normalizers/normalize-project-ranking.js";
import { ValidationError } from "../../../shared/errors/app-error.js";

interface ProjectEntry {
  id: string;
  title: string;
  description: string;
  skills?: string[];
  duration?: string;
  client?: string;
  industry?: string;
}

export interface RankingEntry {
  rank: number;
  id: string;
  title: string;
  rationale: string;
}

export interface ProjectRankingResult {
  /** Vollständige Ranking-Informationen für Diagnostics und Persistenz */
  rankings: RankingEntry[];
  tokensUsed: number;
  llmCallMade: boolean;
}

export async function rankProjects(
  context: PipelineContext,
  postingText: string,
  steeringHints: string[],
  sources: SourceDocument[],
  requirementsMap?: RequirementsMap,
): Promise<ProjectRankingResult> {
  const allProjects = collectAllProjects(sources);
  const targetCount = context.config.pipeline.projectSelection.targetCount;
  const expectedCount = Math.min(allProjects.length, targetCount);

  if (allProjects.length === 0) {
    throw new ValidationError("Keine Projekte fuer das Ranking verfuegbar", {
      targetCount,
    });
  }

  if (allProjects.length === 1) {
    const rankings: RankingEntry[] = allProjects.map((project, index) => ({
      rank: index + 1,
      id: project.id,
      title: project.title,
      rationale: "Einzig verfuegbares Projekt",
    }));

    return {
      rankings,
      tokensUsed: 0,
      llmCallMade: false,
    };
  }

  const llm = createLlmClient(context.config.llm, context.secrets);
  const { systemPrompt, userPrompt } = buildRankProjectsPrompt(
    allProjects,
    postingText,
    steeringHints,
    expectedCount,
    requirementsMap,
  );

  const result = await llm.callLlm({ systemPrompt, userPrompt, label: "rank-projects" });
  const rankings = normalizeProjectRanking(
    result.content,
    allProjects.map((project) => project.id),
    expectedCount,
  );

  return {
    rankings,
    tokensUsed: result.tokensUsed,
    llmCallMade: true,
  };
}

/** Alle Projekte aus allen project-history-Quellen sammeln (dedupliziert nach ID) */
function collectAllProjects(sources: SourceDocument[]): ProjectEntry[] {
  const seen = new Set<string>();
  const projects: ProjectEntry[] = [];
  for (const src of sources) {
    if (src.type !== "project-history") continue;
    const content = src.content as { projects?: ProjectEntry[] };
    if (content.projects) {
      for (const p of content.projects) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          projects.push(p);
        }
      }
    }
  }
  return projects;
}
