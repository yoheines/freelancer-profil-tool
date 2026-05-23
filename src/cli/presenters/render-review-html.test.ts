import { describe, expect, it } from "vitest";
import { renderReviewHtml } from "./render-review-html.js";

describe("renderReviewHtml", () => {
  it("should render a review report with requirements and suggestions", () => {
    const html = renderReviewHtml({
      runId: "review-1",
      postingPath: "sources/ausschreibungen/test.txt",
      sourcePaths: ["sources/profil.yaml", "sources/projekte.yaml"],
      steeringHints: ["Fokus auf CRM"],
      llmTokens: 1234,
      fitSummary: {
        total: 2,
        byCoverage: { gut_belegt: 1, schwach_gestuetzt: 0, unbelegt: 1 },
        criticalGaps: 1,
        overallAssessment: "Kritische Lücken in zentralen Anforderungen; vor einem Generierungslauf sollte das Quellmaterial nachgeschärft werden.",
      },
      requirementsMap: [
        {
          requirement: "SAP IS-U",
          priority: "hoch",
          coverage: "unbelegt",
          evidenceType: "keine",
          keyEvidence: "",
          reasoning: "Keine belastbare Evidenz in den Quellen.",
          suggestedEvidence: "Projektkontext mit praktischer Systemnutzung ergänzen.",
          suggestedSourceLocation: "projektbeschreibung",
          gapPriority: "hoch",
        },
      ],
    });

    expect(html).toContain("Preflight-Analyse");
    expect(html).toContain("SAP IS-U");
    expect(html).toContain("Projektkontext mit praktischer Systemnutzung ergänzen.");
    expect(html).toContain("Zielort: projektbeschreibung");
  });
});
