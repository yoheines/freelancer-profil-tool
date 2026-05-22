/**
 * Kuratiert eine priorisierte Liste von Skill-Keywords aus allen
 * verfügbaren Projekten und Profilqualifikationen.
 *
 * Die Keywords werden am Anfang des Profils als kompakte
 * Stichwortzeile (mit Mittelpunkt-Trennzeichen) platziert.
 */

import type { PipelineContext } from "../pipeline-context.js";
import type { ProfileSkill, SourceDocument } from "../../../model/input/job-posting-input.js";
import type { RequirementsMap } from "../../../model/coverage/requirements-map.js";
import { createLlmClient } from "../../../adapters/llm/openai-compatible-client.js";
import { loadPromptTemplate, fillTemplate } from "../../../adapters/llm/prompt-builder/load-prompt-template.js";
import { buildRequirementsMapEntries, buildSkillRatingsSection, buildSteeringHintsSection } from "../../../adapters/llm/prompt-builder/prompt-sections.js";
import { trimMarkdownBlock } from "../../../shared/text/trim-markdown-block.js";

interface ProjectEntry {
  id: string;
  skills?: string[];
}

interface ProfileEntry {
  skills?: ProfileSkill[];
  languages?: Array<{ language?: string; level?: string }>;
}

export async function curateSkillKeywords(
  context: PipelineContext,
  postingText: string,
  steeringHints: string[],
  sources: SourceDocument[],
  requirementsMap?: RequirementsMap,
): Promise<{ keywords: string[]; tokensUsed: number }> {
  // Technologien aus allen Projekten und dem Profil sammeln.
  const allTechnologies = new Set<string>();
  const candidateKeywords: string[] = [];

  for (const src of sources) {
    if (src.type !== "project-history") continue;
    const content = src.content as { projects?: ProjectEntry[] };
    for (const proj of content.projects ?? []) {
      if (proj.skills) {
        for (const tech of proj.skills) {
          if (!isExcludedKeywordCandidate(tech) && allTechnologies.add(tech)) {
            candidateKeywords.push(tech);
          }
        }
      }
    }
  }

  const profileSource = sources.find((src) => src.type === "profile");
  const profileData = profileSource?.content as ProfileEntry | undefined;
  for (const skill of profileData?.skills ?? []) {
    if (skill.name && !isExcludedKeywordCandidate(skill.name) && allTechnologies.add(skill.name)) {
      candidateKeywords.push(skill.name);
    }
  }
  for (const language of profileData?.languages ?? []) {
    if (!language.language) continue;
    const label = language.level ? `${language.language} (${language.level})` : language.language;
    if (!isExcludedKeywordCandidate(label) && allTechnologies.add(label)) {
      candidateKeywords.push(label);
    }
  }

  if (candidateKeywords.length === 0) {
    return { keywords: [], tokensUsed: 0 };
  }

  // LLM-Call: Priorisierung nach Ausschreibungsrelevanz.
  const llm = createLlmClient(context.config.llm, context.secrets);

  const template = loadPromptTemplate("02-keywords-prompt");
  const keywordTargetCount = context.config.pipeline.keywordSelection.targetCount;

  const systemPrompt = fillTemplate(template.system_prompt, {
    REQUIREMENTS_MAP_ENTRIES: buildRequirementsMapEntries(requirementsMap),
    SKILL_RATINGS_SECTION: buildSkillRatingsSection(sources),
    TARGET_COUNT: String(keywordTargetCount),
  });
  const userPrompt = fillTemplate(template.user_prompt, {
    PROJECT_TECHNOLOGIES: candidateKeywords.join("\n"),
    POSTING_TEXT: postingText,
    STEERING_HINTS_SECTION: buildSteeringHintsSection(steeringHints),
  });

  const result = await llm.callLlm({ systemPrompt, userPrompt, label: "curate-skill-keywords" });

  // 3. Antwort parsen (zeilenweise, da Keywords Kommas enthalten können)
  const keywords = trimMarkdownBlock(result.content)
    .split("\n")
    .map((k) => k.trim())
    .filter((k) => k.length > 0 && !isExcludedKeywordCandidate(k) && candidateKeywords.some((pt) => pt.toLowerCase() === k.toLowerCase()))
    .slice(0, keywordTargetCount);

  return { keywords, tokensUsed: result.tokensUsed };
}

function isExcludedKeywordCandidate(candidate: string): boolean {
  return /^deutsch(?:\s*\(.*\))?$/i.test(candidate.trim());
}
