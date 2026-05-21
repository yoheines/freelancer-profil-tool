import { describe, it, expect } from "vitest";
import { evaluateDraftDiagnostics } from "./evaluate-draft-diagnostics.js";
import type { DiagnosticsInput } from "./evaluate-draft-diagnostics.js";
import type { ProfileCompositionDecision } from "../../../model/composition/profile-composition-decision.js";
import type { StepTiming } from "../../../model/diagnostics/run-diagnostic.js";

function makeInput(overrides?: Partial<DiagnosticsInput>): DiagnosticsInput {
  const composition: ProfileCompositionDecision = {
    headline: "Test",
    sections: [
      { name: "Einleitung", mode: "generated", evidenceRefs: [] },
      { name: "Kontaktdaten", mode: "static", evidenceRefs: [] },
    ],
  };

  const stepTimings: StepTiming[] = [
    { name: "compose", durationMs: 200, status: "ok" },
  ];

  return {
    composition,
    stepTimings,
    llmTokens: 500,
    llmCalls: 3,
    projectRankings: [],
    outputRefs: {
      draftPath: "/tmp/draft.md",
    },
    ...overrides,
  };
}

describe("evaluateDraftDiagnostics", () => {
  it("should calculate correct composition summary counts", () => {
    const input = makeInput({
      composition: {
        headline: "Test",
        sections: [
          { name: "Einleitung", mode: "generated", evidenceRefs: [] },
          { name: "Projekterfahrung", mode: "adapted", evidenceRefs: [] },
          { name: "Qualifikationen", mode: "adapted", evidenceRefs: [] },
          { name: "Kontaktdaten", mode: "static", evidenceRefs: [] },
        ],
      },
    });

    const result = evaluateDraftDiagnostics(input);

    expect(result.compositionSummary.totalSections).toBe(4);
    expect(result.compositionSummary.staticCount).toBe(1);
    expect(result.compositionSummary.adaptedCount).toBe(2);
    expect(result.compositionSummary.generatedCount).toBe(1);
  });

  it("should calculate totalDurationMs from step timings", () => {
    const input = makeInput({
      stepTimings: [
        { name: "load", durationMs: 50, status: "ok" },
        { name: "compose", durationMs: 300, status: "ok" },
      ],
    });

    const result = evaluateDraftDiagnostics(input);

    expect(result.totalDurationMs).toBe(350);
  });

  it("should return all required top-level fields", () => {
    const result = evaluateDraftDiagnostics(makeInput());

    expect(result.structuralWeaknesses).toEqual([]);
    expect(result.ambiguities).toBeUndefined();
    expect(result.llmUsage.totalTokens).toBe(500);
    expect(result.llmUsage.calls).toBe(3);
  });

  it("should derive weaknesses and suggestions from gap analysis", () => {
    const result = evaluateDraftDiagnostics(makeInput({
      gapAnalysis: {
        overallAssessment: "Luecken vorhanden",
        findings: [
          {
            requirement: "A/B-Testing",
            status: "unbelegt",
            reasoning: "Keine klare Projektnennung.",
            suggestedEvidence: "Projekt mit Testdesign ergaenzen.",
            suggestedSourceLocation: "projektbeschreibung",
            priority: "hoch",
          },
        ],
      },
    }));

    expect(result.structuralWeaknesses).toHaveLength(1);
    expect(result.refinementSuggestions).toHaveLength(1);
    expect(result.refinementSuggestions?.[0].type).toBe("expand_project");
  });

  it("should derive weaknesses and suggestions from requirements map during normal runs", () => {
    const result = evaluateDraftDiagnostics(makeInput({
      requirementsMap: {
        entries: [
          {
            requirement: "A/B-Testing",
            priority: "hoch",
            coverage: "unbelegt",
            evidenceType: "keine",
            keyEvidence: "",
          },
          {
            requirement: "Stakeholder-Management",
            priority: "mittel",
            coverage: "schwach_gestuetzt",
            evidenceType: "indirekt",
            keyEvidence: "Projekt X",
          },
        ],
      },
    }));

    expect(result.structuralWeaknesses).toHaveLength(2);
    expect(result.structuralWeaknesses[0].type).toBe("unsupported_requirement");
    expect(result.structuralWeaknesses[1].type).toBe("schwach_gestuetzte_anforderung");
    expect(result.refinementSuggestions).toHaveLength(2);
    expect(result.refinementSuggestions?.[0].type).toBe("add_source_data");
    expect(result.refinementSuggestions?.[1].type).toBe("provide_context");
  });
});
