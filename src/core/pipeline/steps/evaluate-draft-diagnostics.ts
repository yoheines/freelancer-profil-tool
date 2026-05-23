/**
 * Rule-based diagnostics evaluation.
 * Only structural checks — no LLM calls for quality assessment.
 */

import type { ProfileCompositionDecision } from "../../../model/composition/profile-composition-decision.js";
import type { RequirementsMap } from "../../../model/coverage/requirements-map.js";
import type { RunDiagnostic, StepTiming, StructuralWeakness, RefinementSuggestion } from "../../../model/diagnostics/run-diagnostic.js";

export interface DiagnosticsInput {
  composition: ProfileCompositionDecision;
  stepTimings: StepTiming[];
  llmTokens: number;
  llmCalls: number;
  requirementsMap?: RequirementsMap;
  projectRankings: Array<{
    rank: number;
    id: string;
    title: string;
    rationale: string;
  }>;
  outputRefs: {
    draftPath: string;
    metaPath?: string;
  };
}

export function evaluateDraftDiagnostics(input: DiagnosticsInput): RunDiagnostic {
  const weaknesses: StructuralWeakness[] = buildWeaknesses(input.requirementsMap);
  const refinementSuggestions = buildRefinementSuggestions(input.requirementsMap);
  const ambiguities = undefined;

  // Count modes
  const modeCounts = input.composition.sections.reduce(
    (acc, s) => {
      acc[s.mode]++;
      return acc;
    },
    { static: 0, adapted: 0, generated: 0 },
  );

  const totalDurationMs = input.stepTimings.reduce((sum, s) => sum + s.durationMs, 0);

  return {
    totalDurationMs,
    steps: input.stepTimings,
    structuralWeaknesses: weaknesses,
    ambiguities,
    refinementSuggestions,
    compositionSummary: {
      totalSections: input.composition.sections.length,
      staticCount: modeCounts.static,
      adaptedCount: modeCounts.adapted,
      generatedCount: modeCounts.generated,
    },
    llmUsage: {
      totalTokens: input.llmTokens,
      calls: input.llmCalls,
    },
    outputRefs: input.outputRefs,
  };
}

function buildWeaknesses(requirementsMap?: RequirementsMap): StructuralWeakness[] {
  if (!requirementsMap) return [];

  return requirementsMap.entries.flatMap((entry) => {
    if (entry.coverage === "gut_belegt") {
      return [];
    }

    return [{
      type: entry.coverage === "unbelegt"
        ? "unsupported_requirement"
        : "schwach_gestuetzte_anforderung",
      requirement: entry.requirement,
      severity: entry.coverage === "unbelegt" ? "warning" : "info",
      message: entry.reasoning
        ? `${entry.requirement}: ${entry.reasoning}`
        : entry.coverage === "unbelegt"
          ? `${entry.requirement}: In den Quellen aktuell nicht belegt.`
          : `${entry.requirement}: Nur indirekt gestuetzt${entry.keyEvidence ? ` (${entry.keyEvidence})` : ""}.`,
    } satisfies StructuralWeakness];
  });
}

function buildRefinementSuggestions(
  requirementsMap?: RequirementsMap,
): RefinementSuggestion[] | undefined {
  if (!requirementsMap) return undefined;

  const suggestions = requirementsMap.entries
    .filter((entry) => entry.coverage !== "gut_belegt")
    .map((entry) => ({
      requirementId: entry.requirement,
      type: inferSuggestionType(entry.suggestedSourceLocation, entry.coverage),
      message: entry.suggestedEvidence && entry.suggestedSourceLocation
        ? `${entry.requirement} → ${entry.suggestedEvidence} (Zielort: ${entry.suggestedSourceLocation})`
        : entry.coverage === "unbelegt"
          ? `${entry.requirement} → passende Evidenz im Profil oder in Projektbeschreibungen ergänzen.`
          : `${entry.requirement} → vorhandene Evidenz expliziter und belastbarer ausformulieren${entry.keyEvidence ? ` (aktueller Anker: ${entry.keyEvidence})` : "."}`,
    } satisfies RefinementSuggestion));

  return suggestions.length > 0 ? suggestions : undefined;
}

function inferSuggestionType(
  location: RequirementsMap["entries"][number]["suggestedSourceLocation"],
  coverage: RequirementsMap["entries"][number]["coverage"],
): RefinementSuggestion["type"] {
  if (location === "projektbeschreibung") {
    return "expand_project";
  }

  if (location === "summary" || location === "sonstiges") {
    return "provide_context";
  }

  return coverage === "schwach_gestuetzt" ? "provide_context" : "add_source_data";
}
