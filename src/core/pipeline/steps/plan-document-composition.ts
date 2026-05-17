/**
 * Rule-based composition planning.
 *
 * Decides the structure and mode of each profile section based on:
 * - A fixed profile template (which sections exist)
 * - The source data available
 * - The posting text (drives the deterministic headline)
 */

import type { SourceDocument } from "../../../model/input/job-posting-input.js";
import type { ProfileCompositionDecision } from "../../../model/composition/profile-composition-decision.js";
import type { SectionPlan } from "../../../model/composition/section-plan.js";

// Fixed profile template — the known sections of a freelancer profile
const PROFILE_TEMPLATE: Array<{
  name: string;
  defaultMode: "static" | "adapted" | "generated";
  requiresEvidence: boolean;
  alwaysGenerated: boolean;
}> = [
  { name: "Einleitung", defaultMode: "generated", requiresEvidence: true, alwaysGenerated: true },
  { name: "Projekterfahrung", defaultMode: "adapted", requiresEvidence: true, alwaysGenerated: false },
  { name: "Qualifikationen", defaultMode: "adapted", requiresEvidence: true, alwaysGenerated: false },
  { name: "Kontaktdaten", defaultMode: "static", requiresEvidence: false, alwaysGenerated: false },
];

export function planDocumentComposition(
  postingText: string,
  sources: SourceDocument[],
): ProfileCompositionDecision {
  const headline = buildHeadline(postingText);
  const profileData = sources.find((source) => source.type === "profile")?.content as Record<string, unknown> | undefined;
  const projectSources = sources.filter((source) => source.type === "project-history");

  // Build section plans
  const sections: SectionPlan[] = PROFILE_TEMPLATE.map((section) => {
    if (section.alwaysGenerated) {
      return {
        name: section.name,
        mode: "generated" as const,
        evidenceRefs: [],
      };
    }

    if (section.name === "Projekterfahrung") {
      const hasProjects = projectSources.some((source) => Array.isArray((source.content as { projects?: unknown[] }).projects) && ((source.content as { projects?: unknown[] }).projects?.length ?? 0) > 0);

      return {
        name: section.name,
        mode: hasProjects ? "adapted" as const : "generated" as const,
        evidenceRefs: [],
        sourceItem: "project-history",
      };
    }

    if (section.name === "Qualifikationen") {
      const hasProfileQualifications = hasQualificationData(profileData);

      return {
        name: section.name,
        mode: hasProfileQualifications ? "adapted" as const : "generated" as const,
        evidenceRefs: [],
        sourceItem: "profile",
      };
    }

    // Static section (e.g., contact data) — always static, no evidence refs
    return {
      name: section.name,
      mode: "static" as const,
      evidenceRefs: [],
      sourceItem: "profile",
    };
  });

  return { headline, sections };
}

function buildHeadline(postingText: string): string {
  const firstLine = postingText
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? "Erfahrener IT-Freelancer";
  const headline = firstLine
    .replace(/^ausschreibung\s*:\s*/i, "")
    .replace(/^projektanfrage\s*:\s*/i, "")
    .replace(/\(m\/w\/d\)/gi, "")
    .replace(/\s+-\s+.*$/, "")
    .trim();
  return headline || "Erfahrener IT-Freelancer";
}

function hasQualificationData(profileData: Record<string, unknown> | undefined): boolean {
  if (!profileData) return false;

  return [
    profileData.skills,
    profileData.certifications,
    profileData.languages,
    profileData.education,
    profileData.workExperience,
  ].some((value) => Array.isArray(value) && value.length > 0);
}
