import { describe, expect, it } from "vitest";
import { normalizeProfileGapAnalysis } from "./normalize-profile-gap-analysis.js";

describe("normalizeProfileGapAnalysis", () => {
  it("should normalize gap findings from JSON", () => {
    const result = normalizeProfileGapAnalysis(JSON.stringify({
      overallAssessment: "Teilweise gute Passung.",
      findings: [
        {
          requirement: "A/B-Testing",
          status: "unbelegt",
          reasoning: "Keine explizite Nennung in den Quellen.",
          suggestedEvidence: "Konkretes Projekt mit Testdesign und Auswertung ergänzen.",
          suggestedSourceLocation: "projektbeschreibung",
          priority: "hoch",
        },
      ],
    }));

    expect(result.overallAssessment).toBe("Teilweise gute Passung.");
    expect(result.findings[0].status).toBe("unbelegt");
    expect(result.findings[0].suggestedSourceLocation).toBe("projektbeschreibung");
  });
});
