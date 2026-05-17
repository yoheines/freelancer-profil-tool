import { describe, expect, it } from "vitest";
import { buildBatchProjectAdaptationPrompt } from "./project-adaptation-prompt.js";

describe("buildBatchProjectAdaptationPrompt", () => {
  it("should include posting text and project data in the prompt", () => {
    const { userPrompt } = buildBatchProjectAdaptationPrompt([
      {
        id: "proj-1",
        title: "Migration",
        description: "Kubernetes-Einfuehrung",
        skills: ["Kubernetes"],
      },
    ], "Ausschreibung Kubernetes Migration", ["Fokus auf Cloud"], "Deutsch");

    expect(userPrompt).toContain("Ausschreibung Kubernetes Migration");
    expect(userPrompt).toContain("Steuerungshinweise: Fokus auf Cloud");
    expect(userPrompt).toContain('"id": "proj-1"');
    expect(userPrompt).toContain('"skills": [');
  });
});
