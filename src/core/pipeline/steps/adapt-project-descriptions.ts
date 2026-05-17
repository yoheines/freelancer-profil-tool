import type { PipelineContext } from "../pipeline-context.js";
import type { ProfileCompositionDecision } from "../../../model/composition/profile-composition-decision.js";
import type { DraftSection } from "../../../model/draft/profile-draft.js";
import type { RequirementsMap } from "../../../model/coverage/requirements-map.js";
import { buildBatchProjectAdaptationPrompt } from "../../../adapters/llm/prompt-builder/project-adaptation-prompt.js";
import { normalizeBatchProjectAdaptations, type BatchAdaptation } from "../../../adapters/llm/response-normalizers/normalize-batch-project-adaptations.js";
import { createLlmClient } from "../../../adapters/llm/openai-compatible-client.js";
import type { SourceDocument } from "../../../model/input/job-posting-input.js";
import { getDraftTranslations, getProfileLanguageLabel } from "../../../shared/i18n/profile-language.js";

interface ProjectEntry {
  id: string;
  title: string;
  description: string;
  skills?: string[];
  duration?: string;
  client?: string;
  industry?: string;
}

type ProjectAdaptationInput = ProjectEntry;

export async function adaptProjectDescriptions(
  context: PipelineContext,
  composition: ProfileCompositionDecision,
  postingText: string,
  steeringHints: string[],
  sources: SourceDocument[],
  prioritizedKeywords?: string[],
  /** Vollständige Ranking-Informationen (von rank-projects Schritt). */
  projectRankings?: Array<{ id: string }>,
  requirementsMap?: RequirementsMap,
): Promise<{ sections: DraftSection[]; tokensUsed: number }> {
  const sections: DraftSection[] = [];
  let tokensUsed = 0;

  const profileSource = sources.find((s) => s.type === "profile");
  const profileData = profileSource?.content as Record<string, unknown> | undefined;

  for (const section of composition.sections) {
    if (section.mode === "static") {
      sections.push({
        name: section.name,
        content: renderStaticSection(section.name, profileData, context.inputs.targetLanguage),
        compositionMode: "static",
        evidenceRefs: section.evidenceRefs,
      });
      continue;
    }

    if (section.mode === "adapted") {
      if (section.name === "Qualifikationen" || section.name === "Skills") {
        sections.push({
          name: section.name,
          content: renderQualificationsSection(profileData, prioritizedKeywords, context.inputs.targetLanguage),
          compositionMode: "adapted",
          evidenceRefs: section.evidenceRefs,
        });
        continue;
      }

      // Projekterfahrung: Top N Projekte per Batch-LLM-Call adaptieren
      const allProjects = collectAllProjects(sources);
      const rankedIds = projectRankings?.map((r) => r.id);
      const topProjects = selectTopProjects(
        allProjects,
        rankedIds,
        context.config.pipeline.projectSelection.targetCount,
      );

      const adaptationInputs = topProjects;

      if (topProjects.length > 0) {
        const llm = createLlmClient(context.config.llm, context.secrets);
        const { systemPrompt, userPrompt } = buildBatchProjectAdaptationPrompt(
          adaptationInputs,
          postingText,
          steeringHints,
          getProfileLanguageLabel(context.inputs.targetLanguage),
          requirementsMap,
        );
        const result = await llm.callLlm({ systemPrompt, userPrompt, label: "adapt-project-descriptions" });
        const adaptations = normalizeBatchProjectAdaptations(
          result.content,
          adaptationInputs.map((project) => project.id),
        );
        tokensUsed += result.tokensUsed;

        const adaptedBlocks = renderAdaptedProjects(adaptationInputs, adaptations, context.inputs.targetLanguage);

        sections.push({
          name: section.name,
          content: renderProjectExperienceSection(adaptedBlocks, context.inputs.targetLanguage),
          compositionMode: "adapted",
          evidenceRefs: section.evidenceRefs,
        });
      } else {
        sections.push({
          name: section.name,
          content: getDraftTranslations(context.inputs.targetLanguage).placeholders.noProjectData,
          compositionMode: "generated",
          evidenceRefs: [],
        });
      }
      continue;
    }

    // Generated sections: filled later from hook text
    sections.push({
      name: section.name,
      content: "",
      compositionMode: "generated",
      evidenceRefs: section.evidenceRefs,
    });
  }

  return { sections, tokensUsed };
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

/** Top N Projekte aus dem LLM-Ranking auswählen. */
function selectTopProjects(
  allProjects: ProjectEntry[],
  rankedProjectIds?: string[],
  targetCount: number = 5,
): ProjectEntry[] {
  if (rankedProjectIds && rankedProjectIds.length > 0) {
    // LLM-Ranking verwenden
    const selected: ProjectEntry[] = [];
    for (const id of rankedProjectIds) {
      const p = allProjects.find((proj) => proj.id === id);
      if (p) selected.push(p);
      if (selected.length >= targetCount) break;
    }
    return selected;
  }

  // Fallback (sollte nicht vorkommen): erste targetCount Projekte
  return allProjects.slice(0, targetCount);
}

/** Adaptierte Texte auf die Projekt-Blöcke mappen */
function renderAdaptedProjects(
  topProjects: ProjectEntry[],
  adaptations: BatchAdaptation[],
  targetLanguage?: string,
): string[] {
  const adaptMap = new Map<string, string>();
  for (const a of adaptations) {
    adaptMap.set(a.id, a.adaptedText);
  }

  return topProjects.map((project) => {
    const adaptedText = adaptMap.get(project.id) ?? project.description;
    return renderProjectBlock(project, adaptedText, targetLanguage);
  });
}

function renderProjectBlock(project: ProjectEntry, adaptedText: string, targetLanguage?: string): string {
  const translations = getDraftTranslations(targetLanguage);
  const parts: string[] = [];

  parts.push(`### ${project.title}`);

  // Metadata line
  const meta: string[] = [];
  if (project.client) meta.push(`**${translations.metadataLabels.client}:** ${project.client}`);
  if (project.industry) meta.push(`**${translations.metadataLabels.industry}:** ${project.industry}`);
  if (project.duration) meta.push(`**${translations.metadataLabels.period}:** ${project.duration}`);

  if (meta.length > 0) {
    parts.push(meta.join(" · "));
  }

  parts.push("");
  parts.push(adaptedText);

  return parts.join("\n");
}

function renderStaticSection(
  sectionName: string,
  profileData: Record<string, unknown> | undefined,
  targetLanguage?: string,
): string {
  const translations = getDraftTranslations(targetLanguage);
  if (!profileData) {
    return translations.placeholders.noProfileData(sectionName);
  }

  if (sectionName === "Kontaktdaten") {
    const parts: string[] = [];
    if (profileData.name) parts.push(`**${profileData.name}**`);
    if (profileData.title) parts.push(profileData.title as string);
    parts.push("");
    if (profileData.email) parts.push(`📧 ${profileData.email}`);
    if (profileData.phone) parts.push(`📞 ${profileData.phone}`);
    if (profileData.location) parts.push(`📍 ${profileData.location}`);

    // Verfügbarkeit, Auslastung, Onsite-Bereitschaft (optional)
    const meta: string[] = [];
    if (profileData.availability) meta.push(`🕐 ${translations.metadataLabels.available}: ${profileData.availability}`);
    if (profileData.capacity) meta.push(`📊 ${translations.metadataLabels.capacity}: ${profileData.capacity}`);
    if (profileData.onsiteWillingness) meta.push(`🏢 ${translations.metadataLabels.onsite}: ${profileData.onsiteWillingness}`);
    if (meta.length > 0) {
      parts.push("");
      parts.push(meta.join(" · "));
    }

    return parts.join("\n");
  }

  return translations.placeholders.staticContent(sectionName);
}

function renderQualificationsSection(
  profileData: Record<string, unknown> | undefined,
  prioritizedKeywords?: string[],
  targetLanguage?: string,
): string {
  const translations = getDraftTranslations(targetLanguage);
  if (!profileData) {
    return translations.placeholders.noProfileData("Qualifikationen");
  }

  const parts: string[] = [];

  const curatedSkills = curateCoreSkills(
    profileData.skills as Array<{ name: string; level?: string }> | undefined,
    prioritizedKeywords,
  );
  if (curatedSkills.length > 0) {
    parts.push(`### ${translations.qualificationTitles.coreCompetencies}\n`);
    for (const skill of curatedSkills) {
      parts.push(`- ${skill}`);
    }
  }

  // Certifications
  const certs = profileData.certifications as string[] | undefined;
  if (certs && certs.length > 0) {
    parts.push(`\n### ${translations.qualificationTitles.certifications}\n`);
    for (const cert of certs) {
      parts.push(`- ${cert}`);
    }
  }

  // Languages
  const langs = profileData.languages as Array<{ language: string; level: string }> | undefined;
  if (langs && langs.length > 0) {
    parts.push(`\n### ${translations.qualificationTitles.languages}\n`);
    for (const lang of langs) {
      parts.push(`- ${lang.language}: ${lang.level}`);
    }
  }

  const education = profileData.education as Array<{ degree: string; institution: string; period?: string }> | undefined;
  if (education && education.length > 0) {
    parts.push(`\n### ${translations.qualificationTitles.education}\n`);
    for (const entry of education) {
      const segments = [entry.degree, entry.institution, entry.period].filter(Boolean);
      parts.push(`- ${segments.join(" · ")}`);
    }
  }

  const workExperience = profileData.workExperience as Array<{ period?: string; role: string; company: string }> | undefined;
  if (workExperience && workExperience.length > 0) {
    parts.push(`\n### ${translations.qualificationTitles.careerStations}\n`);
    for (const entry of workExperience) {
      const segments = [entry.period, entry.role, entry.company].filter(Boolean);
      parts.push(`- ${segments.join(" · ")}`);
    }
  }

  return parts.join("\n");
}

function curateCoreSkills(
  skills: Array<{ name: string; level?: string }> | undefined,
  prioritizedKeywords?: string[],
): string[] {
  if (!skills || skills.length === 0) {
    return [];
  }

  const priorityOrder = new Map(
    (prioritizedKeywords ?? []).map((keyword, index) => [keyword.toLowerCase(), index]),
  );
  const uniqueSkills: string[] = [];
  const seen = new Set<string>();

  for (const skill of skills) {
    const normalized = skill.name.trim();
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    uniqueSkills.push(normalized);
  }

  return uniqueSkills
    .sort((left, right) => {
      const leftPriority = priorityOrder.get(left.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;
      const rightPriority = priorityOrder.get(right.toLowerCase()) ?? Number.MAX_SAFE_INTEGER;

      if (leftPriority !== rightPriority) {
        return leftPriority - rightPriority;
      }

      return 0;
    })
    .slice(0, 10);
}

function renderProjectExperienceSection(
  adaptedBlocks: string[],
  targetLanguage?: string,
): string {
  if (adaptedBlocks.length === 0) {
    return getDraftTranslations(targetLanguage).placeholders.noProjectData;
  }

  return adaptedBlocks.join("\n\n");
}
