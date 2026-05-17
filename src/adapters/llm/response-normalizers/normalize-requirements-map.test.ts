import { describe, expect, it } from "vitest";
import { normalizeRequirementsMap } from "./normalize-requirements-map.js";

describe("normalizeRequirementsMap", () => {
  it("should normalize evidenceType and fallback values", () => {
    const result = normalizeRequirementsMap(JSON.stringify({
      entries: [
        {
          requirement: "Scrum",
          priority: "hoch",
          coverage: "gut_belegt",
          evidenceType: "zertifikat",
          keyEvidence: "PSM",
        },
        {
          requirement: "Design Thinking",
          priority: "mittel",
          coverage: "schwach_gestuetzt",
          keyEvidence: "Skill-Eintrag",
        },
      ],
    }));

    expect(result.entries[0].evidenceType).toBe("zertifikat");
    expect(result.entries[1].evidenceType).toBe("indirekt");
  });
});
