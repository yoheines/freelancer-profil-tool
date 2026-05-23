import { describe, expect, it } from "vitest";
import { buildBatchProjectAdaptationPrompt } from "./project-adaptation-prompt.js";

describe("buildBatchProjectAdaptationPrompt", () => {
  it("should include posting text and project data in the prompt", () => {
    const { userPrompt } = buildBatchProjectAdaptationPrompt([
      {
        id: "proj-1",
        title: "Migration",
        description: "Kubernetes-Einfuehrung",
        skills: [
          {
            name: "Kubernetes",
            context: "Technischer Schwerpunkt im Projekt; Konzeption und Einfuehrung der Plattform.",
          },
        ],
      },
    ], "Ausschreibung Kubernetes Migration", ["Fokus auf Cloud"], "Deutsch");

    expect(userPrompt).toContain("Ausschreibung Kubernetes Migration");
    expect(userPrompt).toContain("Steuerungshinweise: Fokus auf Cloud");
    expect(userPrompt).toContain('"id": "proj-1"');
    expect(userPrompt).toContain('"skills": [');
    expect(userPrompt).toContain('"name": "Kubernetes"');
    expect(userPrompt).toContain('"context": "Technischer Schwerpunkt im Projekt; Konzeption und Einfuehrung der Plattform."');
  });

  it("should instruct the model to professionally condense raw skill contexts", () => {
    const { systemPrompt } = buildBatchProjectAdaptationPrompt([
      {
        id: "proj-1",
        title: "Migration",
        description: "Originalbeschreibung",
      },
    ], "Ausschreibung", [], "Deutsch");

    expect(systemPrompt).toContain("Skill-Kontexte sind Rohhinweise");
    expect(systemPrompt).toContain("Operative Einzeltaetigkeiten duerfen zu einer fachlich passenden Erfahrungsaussage");
    expect(systemPrompt).toContain("verdichtet werden, solange keine hoehere Verantwortung oder Entscheidungshoheit");
  });
});
