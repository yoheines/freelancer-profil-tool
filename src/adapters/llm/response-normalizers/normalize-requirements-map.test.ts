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
          reasoning: "Direkt durch Zertifikat belegt.",
        },
        {
          requirement: "Design Thinking",
          priority: "mittel",
          coverage: "schwach_gestuetzt",
          keyEvidence: "Skill-Eintrag",
          reasoning: "Nur indirekt aus Profil und Projekten ableitbar.",
          suggestedEvidence: "Projektbezug expliziter machen.",
          suggestedSourceLocation: "projektbeschreibung",
          gapPriority: "mittel",
        },
      ],
    }));

    expect(result.entries[0].evidenceType).toBe("zertifikat");
    expect(result.entries[0].reasoning).toBe("Direkt durch Zertifikat belegt.");
    expect(result.entries[1].evidenceType).toBe("indirekt");
    expect(result.entries[1].suggestedEvidence).toBe("Projektbezug expliziter machen.");
    expect(result.entries[1].suggestedSourceLocation).toBe("projektbeschreibung");
    expect(result.entries[1].gapPriority).toBe("mittel");
  });

  it("should ignore gap fields for well-covered requirements", () => {
    const result = normalizeRequirementsMap(JSON.stringify({
      entries: [
        {
          requirement: "Stakeholder-Management",
          priority: "hoch",
          coverage: "gut_belegt",
          evidenceType: "projekt",
          keyEvidence: "Projekt X",
          suggestedEvidence: "Mehr Kontext",
          suggestedSourceLocation: "summary",
          gapPriority: "hoch",
        },
      ],
    }));

    expect(result.entries[0].gapPriority).toBeUndefined();
    expect(result.entries[0].suggestedSourceLocation).toBe("summary");
  });
});
