import { describe, expect, it } from "vitest";
import { buildRankProjectsPrompt } from "./rank-projects-prompt.js";

describe("buildRankProjectsPrompt", () => {
  it("should include project data and posting text in the prompt", () => {
    const { userPrompt, systemPrompt } = buildRankProjectsPrompt([
      {
        id: "proj-1",
        title: "Projekt 1",
        description: "Beschreibung",
      },
      {
        id: "proj-2",
        title: "Projekt 2",
        description: "Beschreibung",
      },
    ], "Ausschreibung Website-Strategie", ["Fokus auf Product Owner"], 2);

    expect(systemPrompt).toContain("Senior Recruiter");
    expect(userPrompt).toContain("Ausschreibung Website-Strategie");
    expect(userPrompt).toContain("Steuerungshinweise: Fokus auf Product Owner");
    expect(userPrompt).toContain('"id": "proj-1"');
    expect(userPrompt).toContain("EXAKT 2 Einträge");
  });

  it("should omit the steering block when no hints exist", () => {
    const { userPrompt } = buildRankProjectsPrompt([
      { id: "proj-1", title: "Projekt 1", description: "Beschreibung" },
    ], "Ausschreibung", [], 1);

    expect(userPrompt).not.toContain("Zusätzliche Information vom Nutzer");
  });

  it("should include requirements map strategies when provided", () => {
    const { systemPrompt } = buildRankProjectsPrompt([
      {
        id: "proj-1",
        title: "Projekt 1",
        description: "Beschreibung",
      },
    ], "Ausschreibung Website-Strategie", [], 1, {
      entries: [
        {
          requirement: "Stakeholder-Management",
          priority: "hoch",
          coverage: "gut_belegt",
          evidenceType: "projekt",
          keyEvidence: "Projekt 1",
        },
      ],
    });

    expect(systemPrompt).toContain("Requirements-Map");
    expect(systemPrompt).toContain("Stakeholder-Management");
  });

  it("should include structured project skill contexts in the prompt", () => {
    const { userPrompt, systemPrompt } = buildRankProjectsPrompt([
      {
        id: "proj-1",
        title: "Projekt 1",
        description: "Beschreibung",
        skills: [
          {
            name: "SAP IS-U",
            context: "Operative Nutzung im Tagesgeschaeft bei Kundenanfragen; relevant als praktische Systemerfahrung.",
          },
        ],
      },
    ], "Ausschreibung Energie", [], 1);

    expect(userPrompt).toContain('"name": "SAP IS-U"');
    expect(userPrompt).toContain('"context": "Operative Nutzung im Tagesgeschaeft bei Kundenanfragen; relevant als praktische Systemerfahrung."');
    expect(systemPrompt).toContain("Skill-Kontexten als konkrete Evidenz");
  });
});
