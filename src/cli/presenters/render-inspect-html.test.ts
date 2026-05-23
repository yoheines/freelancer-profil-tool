import { describe, expect, it } from "vitest";
import { renderInspectHtml } from "./render-inspect-html.js";

describe("renderInspectHtml", () => {
  it("should render ranking, requirements and diagnostics", () => {
    const html = renderInspectHtml({
      runId: "run-1",
      inputs: {
        postingPath: "sources/ausschreibungen/test.txt",
        sourcePaths: ["sources/profil.yaml", "sources/projekte.yaml"],
        steeringHints: ["Fokus auf CRM"],
        targetLanguage: "de",
      },
      composition: {
        headline: "Test Headline",
        sections: [
          { name: "Einleitung", mode: "generated", evidenceRefs: [] },
        ],
      },
      requirementsMap: [
        {
          requirement: "CRM",
          priority: "hoch",
          coverage: "schwach_gestuetzt",
          evidenceType: "indirekt",
          keyEvidence: "Projekt X",
          reasoning: "Nur indirekt aus Projektbeschreibung und Skill-Kontext ableitbar.",
          suggestedEvidence: "CRM-Migrationsbezug expliziter formulieren.",
          suggestedSourceLocation: "projektbeschreibung",
          gapPriority: "mittel",
        },
      ],
      projectRankings: [
        { rank: 1, id: "proj-1", title: "Projekt 1", rationale: "Beste Passung" },
      ],
      diagnostics: {
        totalDurationMs: 900,
        steps: [{ name: "rank-projects", durationMs: 200, status: "ok" }],
        structuralWeaknesses: [{ type: "schwach_gestuetzte_anforderung", requirement: "CRM", severity: "info", message: "CRM: Nur indirekt belegt." }],
        refinementSuggestions: [{ requirementId: "CRM", type: "expand_project", message: "CRM → CRM-Migrationsbezug expliziter formulieren. (Zielort: projektbeschreibung)" }],
        compositionSummary: { totalSections: 1, staticCount: 0, adaptedCount: 0, generatedCount: 1 },
        llmUsage: { totalTokens: 1000, calls: 5 },
        outputRefs: { draftPath: "runs/run-1/profile-draft.yaml", metaPath: "runs/run-1/run-meta.yaml" },
      },
    });

    expect(html).toContain("Run-Analyse");
    expect(html).toContain("Projekt 1");
    expect(html).toContain("CRM");
    expect(html).toContain("CRM-Migrationsbezug expliziter formulieren.");
    expect(html).toContain("Pipeline-Schritte");
  });
});
