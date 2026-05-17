import { trimMarkdownBlock } from "../../../shared/text/trim-markdown-block.js";
import { ValidationError } from "../../../shared/errors/app-error.js";
import type { GapFinding, ProfileGapAnalysis } from "../../../model/review/profile-gap-analysis.js";

interface RawGapAnalysis {
  overallAssessment?: string;
  findings?: Array<Partial<GapFinding>>;
}

export function normalizeProfileGapAnalysis(raw: string): ProfileGapAnalysis {
  const cleaned = trimMarkdownBlock(raw);
  let parsed: RawGapAnalysis;

  try {
    parsed = JSON.parse(cleaned) as RawGapAnalysis;
  } catch {
    throw new ValidationError("Failed to parse profile gap analysis from LLM response", {
      raw: cleaned.slice(0, 500),
    });
  }

  return {
    overallAssessment: parsed.overallAssessment ?? "",
    findings: (parsed.findings ?? []).map((finding) => ({
      requirement: finding.requirement ?? "",
      status: normalizeGapStatus(finding.status),
      reasoning: finding.reasoning ?? "",
      suggestedEvidence: finding.suggestedEvidence ?? "",
      suggestedSourceLocation: normalizeGapSourceLocation(finding.suggestedSourceLocation),
      priority: normalizeGapPriority(finding.priority),
      gapPriority: finding.gapPriority ? normalizeGapPriority(finding.gapPriority) : undefined,
    })),
  };
}

function normalizeGapStatus(value: GapFinding["status"] | undefined): GapFinding["status"] {
  return value === "gut_belegt" || value === "schwach_gestuetzt" ? value : "unbelegt";
}

function normalizeGapPriority(value: GapFinding["priority"] | undefined): GapFinding["priority"] {
  return value === "hoch" || value === "mittel" ? value : "niedrig";
}

function normalizeGapSourceLocation(
  value: GapFinding["suggestedSourceLocation"] | undefined,
): GapFinding["suggestedSourceLocation"] {
  switch (value) {
    case "summary":
    case "skills":
    case "certifications":
    case "languages":
    case "projektbeschreibung":
    case "workExperience":
    case "availability":
    case "capacity":
    case "onsiteWillingness":
      return value;
    default:
      return "sonstiges";
  }
}
