import { describe, expect, it } from "vitest";
import { summarizeRequirementsFit } from "./summarize-requirements-fit.js";

describe("summarizeRequirementsFit", () => {
  it("should count coverage states and identify critical gaps", () => {
    const summary = summarizeRequirementsFit([
      { requirement: "A", priority: "hoch", coverage: "unbelegt", evidenceType: "keine", keyEvidence: "" },
      { requirement: "B", priority: "mittel", coverage: "schwach_gestuetzt", evidenceType: "indirekt", keyEvidence: "Projekt X" },
      { requirement: "C", priority: "niedrig", coverage: "gut_belegt", evidenceType: "projekt", keyEvidence: "Projekt Y" },
    ]);

    expect(summary.total).toBe(3);
    expect(summary.byCoverage.unbelegt).toBe(1);
    expect(summary.byCoverage.schwach_gestuetzt).toBe(1);
    expect(summary.byCoverage.gut_belegt).toBe(1);
    expect(summary.criticalGaps).toBe(1);
  });
});
