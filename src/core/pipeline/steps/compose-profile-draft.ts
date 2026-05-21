/**
 * Builds the structured YAML data for profile-draft.yaml.
 * All data is assembled from pipeline step outputs – purely deterministic.
 */

import type { DraftSection, ProfileYamlData } from "../../../model/draft/profile-draft.js";
import type { SourceDocument } from "../../../model/input/job-posting-input.js";

/**
 * Baut das strukturierte YAML-Objekt für profile-draft.yaml.
 * Nutzt Sections für generierte Texte und Quell-Profil für Stammdaten.
 * Kein Regex-Parsing nötig – alle Daten liegen strukturiert vor.
 */
export function composeProfileYaml(
  sections: DraftSection[],
  skillKeywords: string[],
  sources: SourceDocument[],
  hookText: string,
  projectRankings?: Array<{ id: string }>,
  targetLanguage?: string,
): ProfileYamlData {
  // ── Stammdaten aus dem Profil-Source ──────────────────
  const profileSource = sources.find((s) => s.type === "profile");
  const profileData = profileSource?.content as Record<string, unknown> | undefined;

  const name = (profileData?.name as string) ?? "";
  const title = (profileData?.title as string) ?? "";
  const email = (profileData?.email as string) ?? "";
  const phone = (profileData?.phone as string) ?? "";
  const location = (profileData?.location as string) ?? "";

  const availParts = [
    profileData?.availability,
    profileData?.capacity,
    profileData?.onsiteWillingness,
  ].filter(Boolean) as string[];
  const availabilityText = availParts.join(" · ");

  const certifications = (profileData?.certifications as string[]) ?? [];

  const rawEducation = (profileData?.education as Array<Record<string, string>>) ?? [];
  const education = rawEducation.map((e) => ({
    degree: e.degree ?? "",
    institution: e.institution ?? "",
    period: e.period ?? "",
  }));

  const rawLanguages = (profileData?.languages as Array<Record<string, string>>) ?? [];
  const languages = rawLanguages.map((l) => ({
    lang: l.language ?? l.lang ?? "",
    level: l.level ?? "",
  }));

  // ── Generierte Texte ──────────────────────────────────
  const summary = hookText || sections.find((s) => s.name === "Einleitung")?.content || "";
  const skills = skillKeywords ?? [];

  // Projekte: adaptierte Beschreibungen aus Sections + Rohdaten aus Quelle
  const projectSource = sources.find((s) => s.type === "project-history");
  const rawProjects = (projectSource?.content as { projects?: Array<Record<string, unknown>> })?.projects ?? [];

  // Nur gerankte Projekte aufnehmen (falls Rankings vorhanden)
  const rankedIds = projectRankings?.map((r) => r.id) ?? [];
  const filteredProjects = rankedIds.length > 0
    ? rawProjects.filter((p) => rankedIds.includes((p.id as string) ?? ""))
        .sort((a, b) => rankedIds.indexOf((a.id as string)) - rankedIds.indexOf((b.id as string)))
    : rawProjects;

  // Adaptierte Beschreibungen aus der Projekterfahrung-Section parsen
  const projectSection = sections.find((s) => s.name === "Projekterfahrung");
  const adaptedTexts = parseAdaptedProjects(projectSection?.content ?? "");

  const projects = filteredProjects.map((p, idx) => {
    const projectId = (p.id as string) ?? "";
    // Adapted descriptions are keyed by ranking index (0..n)
    const adaptedDesc = adaptedTexts.get(String(idx));
    return {
      title: (p.title as string) ?? "",
      client: (p.client as string) ?? (p.company as string) ?? "",
      branch: (p.branch as string) ?? (p.industry as string) ?? "",
      period: (p.duration as string) ?? (p.period as string) ?? (p.zeitraum as string) ?? "",
      description: adaptedDesc ?? (p.description as string) ?? "",
    };
  });

  return {
    summary,
    skills,
    projects,
    name,
    title,
    tagline: title,
    email,
    phone,
    location,
    availabilityText,
    certifications,
    education,
    languages,
  };
}

/**
 * Parst die adaptierten Projekttexte aus dem Markdown der Projekterfahrung-Section.
 * Liefert eine Map von Projekt-ID → adaptierte Beschreibung.
 * Da die Projekte in definierter Reihenfolge aus den rankings stammen,
 * können wir sie über den Index mit den Rohdaten verknüpfen.
 */
function parseAdaptedProjects(sectionContent: string): Map<string, string> {
  const result = new Map<string, string>();

  // Jeder Projekt-Eintrag beginnt mit "### Titel" und hat einen Beschreibungs-Absatz
  const projectBlocks = sectionContent.split(/(?=^### )/m);
  let index = 0;

  for (const block of projectBlocks) {
    const trimmed = block.trim();
    if (!trimmed.startsWith("### ")) continue;

    // Beschreibung ist der letzte Absatz (nach **Auftraggeber:** Zeile)
    const lines = trimmed.split("\n").map((l) => l.trim()).filter(Boolean);
    // Letzte nicht-leere Zeile ist die Beschreibung
    const desc = lines[lines.length - 1] ?? "";

    // ID aus Index, da wir die Reihenfolge aus projectRankings kennen
    result.set(String(index), desc);
    index++;
  }

  return result;
}
