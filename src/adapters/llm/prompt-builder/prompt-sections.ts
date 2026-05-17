import type { RequirementsMap } from "../../../model/coverage/requirements-map.js";

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
