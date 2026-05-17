import { trimMarkdownBlock } from "../../../shared/text/trim-markdown-block.js";
import { ValidationError } from "../../../shared/errors/app-error.js";
import type { RequirementsMap, RequirementsMapEntry } from "../../../model/coverage/requirements-map.js";

interface RawEntry {
  requirement?: string;
  priority?: string;
  coverage?: string;
  evidenceType?: string;
  keyEvidence?: string;
}

interface RawResponse {
  entries?: RawEntry[];
}

export function normalizeRequirementsMap(raw: string): RequirementsMap {
  const cleaned = trimMarkdownBlock(raw);
  let parsed: RawResponse;

  try {
    parsed = JSON.parse(cleaned) as RawResponse;
  } catch {
    throw new ValidationError("Failed to parse requirements map from LLM response", {
      raw: cleaned.slice(0, 500),
    });
  }

  const entries: RequirementsMapEntry[] = (parsed.entries ?? []).map((entry) => ({
    requirement: entry.requirement ?? "",
    priority: normalizePriority(entry.priority),
    coverage: normalizeCoverage(entry.coverage),
    evidenceType: normalizeEvidenceType(entry.evidenceType, entry.coverage),
    keyEvidence: entry.keyEvidence ?? "",
  }));

  return { entries };
}

function normalizePriority(value: string | undefined): "hoch" | "mittel" | "niedrig" {
  if (value === "hoch" || value === "mittel") return value;
  return "niedrig";
}

function normalizeCoverage(value: string | undefined): RequirementsMapEntry["coverage"] {
  if (value === "gut_belegt" || value === "schwach_gestuetzt") return value;
  return "unbelegt";
}

function normalizeEvidenceType(
  value: string | undefined,
  coverage: string | undefined,
): RequirementsMapEntry["evidenceType"] {
  switch (value) {
    case "projekt":
    case "zertifikat":
    case "profil_skill":
    case "rolle":
    case "indirekt":
    case "keine":
      return value;
    default:
      return coverage === "unbelegt" ? "keine" : "indirekt";
  }
}
