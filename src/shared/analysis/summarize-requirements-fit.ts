import type { CoverageLevel, RequirementsMapEntry } from "../../model/coverage/requirements-map.js";

export interface RequirementsFitSummary {
  total: number;
  byCoverage: Record<CoverageLevel, number>;
  criticalGaps: number;
  overallAssessment: string;
}

export function summarizeRequirementsFit(entries: RequirementsMapEntry[]): RequirementsFitSummary {
  const byCoverage: Record<CoverageLevel, number> = {
    gut_belegt: 0,
    schwach_gestuetzt: 0,
    unbelegt: 0,
  };

  let criticalGaps = 0;

  for (const entry of entries) {
    byCoverage[entry.coverage]++;

    if (entry.priority === "hoch" && entry.coverage !== "gut_belegt") {
      criticalGaps++;
    }
  }

  return {
    total: entries.length,
    byCoverage,
    criticalGaps,
    overallAssessment: deriveOverallAssessment(byCoverage, criticalGaps),
  };
}

function deriveOverallAssessment(
  byCoverage: Record<CoverageLevel, number>,
  criticalGaps: number,
): string {
  if (criticalGaps > 0 || byCoverage.unbelegt >= 3) {
    return "Kritische Lücken in zentralen Anforderungen; vor einem Generierungslauf sollte das Quellmaterial nachgeschärft werden.";
  }

  if (byCoverage.unbelegt > 0 || byCoverage.schwach_gestuetzt >= 3) {
    return "Teilweise gute Passung mit erkennbarem Nachschärfungsbedarf bei einzelnen Anforderungen.";
  }

  if (byCoverage.schwach_gestuetzt > 0) {
    return "Grundsätzlich gute Passung; vorhandene Evidenz könnte an wenigen Stellen noch expliziter formuliert werden.";
  }

  return "Sehr gute Passung; die relevanten Anforderungen sind im Quellmaterial gut belegt.";
}
