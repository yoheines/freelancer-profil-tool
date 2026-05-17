import { describe, expect, it } from "vitest";
import { renderInspect, type InspectData } from "./render-inspect.js";

describe("renderInspect", () => {
  const mockData: InspectData = {
    runId: "test-run",
    composition: {
      headline: "Test",
      sections: [],
    },
    requirementsMap: [
      {
        requirement: "Stakeholder-Management",
        priority: "hoch",
        coverage: "gut_belegt",
        evidenceType: "projekt",
        keyEvidence: "Projekt 1",
      },
    ],
    gapAnalysis: {
      overallAssessment: "Teilweise gute Passung",
      findings: [
        {
          requirement: "A/B-Testing",
          status: "unbelegt",
          reasoning: "Keine explizite Nennung.",
          suggestedEvidence: "Projekt mit Testdesign ergänzen.",
          suggestedSourceLocation: "projektbeschreibung",
          priority: "hoch",
        },
      ],
    },
    diagnostics: {
      totalDurationMs: 1000,
      steps: [],
      llmUsage: { calls: 1, totalTokens: 100 },
      compositionSummary: { totalSections: 0, staticCount: 0, adaptedCount: 0, generatedCount: 0 },
      structuralWeaknesses: [],
      refinementSuggestions: [],
      ambiguities: [],
      outputRefs: { draftPath: "d", intermediatePath: "i", diagnosticsPath: "di", gapAnalysisPath: "g" },
    },
    projectRankings: [
      { rank: 1, id: "proj-1", title: "Projekt 1", rationale: "Beste Passung" },
      { rank: 2, id: "proj-2", title: "Projekt 2", rationale: "Gute Passung" },
    ],
  };

  it("should render project ranking with rank, title and rationale", () => {
    const output = renderInspect(mockData);

    expect(output).toContain("📌 Headline");
    expect(output).toContain("🧩 Requirements-Map");
    expect(output).toContain("Stakeholder-Management");
    expect(output).toContain("Evidenztyp: projekt");
    expect(output).toContain("🏆 Projekt-Ranking (2 Projekte)");
    expect(output).toContain("#1 Projekt 1 (proj-1)");
    expect(output).toContain("Beste Passung");
    expect(output).toContain("#2 Projekt 2 (proj-2)");
    expect(output).toContain("🧭 Gap-Analyse");
  });
});
