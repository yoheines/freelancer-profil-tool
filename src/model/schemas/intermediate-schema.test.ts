import { describe, expect, it } from "vitest";
import { intermediateModelSchema } from "./intermediate-schema.js";

describe("intermediateModelSchema", () => {
  it("should accept projectRankings without evidence metadata", () => {
    const validData = {
      runMetadata: { runId: "123", createdAt: "2026-05-15" },
      inputs: { postingPath: "a", sourcePaths: ["b"], steeringHints: [] },
      requirementAnalysis: {
        explicitRequirements: [],
        implicitSignals: [],
        priorities: [],
        ambiguities: [],
        positioningHeadline: "Head",
      },
      evidenceSelection: { selectedEvidence: [], unsupportedRequirements: [] },
      compositionPlan: {
        headline: "Head",
        sections: [],
      },
      projectRankings: [
        {
          rank: 1,
          id: "proj-1",
          title: "Projekt 1",
          rationale: "Passt gut",
        },
      ],
    };

    const result = intermediateModelSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});
