import type { RequirementsMap } from "../../../model/coverage/requirements-map.js";
import type { SourceDocument } from "../../../model/input/job-posting-input.js";

export function buildSteeringHintsSection(steeringHints: string[]): string {
  if (steeringHints.length === 0) {
    return "";
  }

  return [
    "Zusätzliche Information vom Nutzer:",
    "Die folgenden Steuerungshinweise sind optionale Hinweise für diesen Lauf.",
    "Sie können für diesen Schritt relevant sein, müssen es aber nicht.",
    "Berücksichtige sie nur, wenn sie für die aktuelle Aufgabe hilfreich sind.",
    "",
    `Steuerungshinweise: ${steeringHints.join(", ")}`,
    "",
  ].join("\n");
}

/**
 * Baut einen optionalen Prompt-Block mit den Vertrautheits-Ratings
 * der Profil-Skills. Nur Skills mit vorhandenem `rating`-Feld
 * werden aufgeführt. Ist kein Skill mit Rating vorhanden, wird
 * eine leere Zeichenkette zurückgegeben (kein Block im Prompt).
 */
export function buildSkillRatingsSection(sources: SourceDocument[]): string {
  const profileSource = sources.find((s) => s.type === "profile");
  const profileData = profileSource?.content as Record<string, unknown> | undefined;
  const skills = profileData?.skills as Array<Record<string, unknown>> | undefined;

  if (!skills || skills.length === 0) {
    return "";
  }

  const ratedSkills = skills
    .filter((s) => s.name && s.rating)
    .map((s) => `  - ${s.name}: ${s.rating}`);

  if (ratedSkills.length === 0) {
    return "";
  }

  return [
    "Vertrautheit mit den Profil-Skills (falls angegeben):",
    "Manche Skills im Profil sind mit einem Vertrautheits-Rating (high/medium/low) versehen.",
    "Berücksichtige dies bei der Gewichtung: Skills mit hoher Vertrautheit sind Kernkompetenzen",
    "und sollten tendenziell priorisiert werden, solche mit niedriger Vertrautheit eher zurückhaltend.",
    "",
    ...ratedSkills,
    "",
  ].join("\n");
}

export function buildRequirementsMapEntries(requirementsMap?: RequirementsMap): string {
  if (!requirementsMap || requirementsMap.entries.length === 0) {
    return "- Keine Requirements-Map verfügbar";
  }

  return requirementsMap.entries
    .map((entry) => (
      `- ${entry.requirement}: priority=${entry.priority}, coverage=${entry.coverage}, evidenceType=${entry.evidenceType}${entry.keyEvidence ? `, Evidenz=${entry.keyEvidence}` : ""}`
    ))
    .join("\n");
}
