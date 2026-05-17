import { describe, expect, it } from "vitest";
import { normalizeBatchProjectAdaptations } from "./normalize-batch-project-adaptations.js";

describe("normalizeBatchProjectAdaptations", () => {
  it("should accept complete adaptation sets", () => {
    const result = normalizeBatchProjectAdaptations(JSON.stringify({
      adaptations: [
        { index: 1, id: "proj-1", adaptedText: "Leitung der Migration." },
        { index: 2, id: "proj-2", adaptedText: "Konzeption der Plattform." },
      ],
    }), ["proj-1", "proj-2"]);

    expect(result).toHaveLength(2);
  });

  it("should reject incomplete adaptation sets", () => {
    expect(() => normalizeBatchProjectAdaptations(JSON.stringify({
      adaptations: [
        { index: 1, id: "proj-1", adaptedText: "Leitung der Migration." },
      ],
    }), ["proj-1", "proj-2"])).toThrow(/incomplete/i);
  });

  it("should reject empty adapted texts", () => {
    expect(() => normalizeBatchProjectAdaptations(JSON.stringify({
      adaptations: [
        { index: 1, id: "proj-1", adaptedText: "" },
      ],
    }), ["proj-1"])).toThrow(/empty adapted texts/i);
  });

  it("should reject unexpected project ids", () => {
    expect(() => normalizeBatchProjectAdaptations(JSON.stringify({
      adaptations: [
        { index: 1, id: "proj-1", adaptedText: "Leitung der Migration." },
        { index: 2, id: "proj-99", adaptedText: "Zusatzprojekt." },
      ],
    }), ["proj-1"])).toThrow(/unexpected project ids/i);
  });
});
