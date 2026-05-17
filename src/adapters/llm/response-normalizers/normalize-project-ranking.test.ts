import { describe, expect, it } from "vitest";
import { normalizeProjectRanking } from "./normalize-project-ranking.js";

describe("normalizeProjectRanking", () => {
  it("should accept a valid ranking subset", () => {
    const result = normalizeProjectRanking(JSON.stringify({
      rankings: [
        { rank: 2, id: "proj-2", title: "Projekt 2", rationale: "Passt" },
        { rank: 1, id: "proj-1", title: "Projekt 1", rationale: "Passt besser" },
      ],
    }), ["proj-1", "proj-2", "proj-3"], 2);

    expect(result.map((entry) => entry.id)).toEqual(["proj-1", "proj-2"]);
  });

  it("should reject duplicate ids", () => {
    expect(() => normalizeProjectRanking(JSON.stringify({
      rankings: [
        { rank: 1, id: "proj-1", title: "Projekt 1", rationale: "Passt" },
        { rank: 2, id: "proj-1", title: "Projekt 1", rationale: "Auch passt" },
      ],
    }), ["proj-1", "proj-2"], 2)).toThrow(/duplicate project IDs/);
  });

  it("should reject missing entries when all projects must be ranked", () => {
    expect(() => normalizeProjectRanking(JSON.stringify({
      rankings: [
        { rank: 1, id: "proj-1", title: "Projekt 1", rationale: "Passt" },
      ],
    }), ["proj-1", "proj-2"], 2)).toThrow(/unexpected number of entries/);
  });
});
