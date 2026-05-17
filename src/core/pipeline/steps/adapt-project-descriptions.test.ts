import { describe, expect, it, vi } from "vitest";
import { adaptProjectDescriptions } from "./adapt-project-descriptions.js";
import type { PipelineContext } from "../pipeline-context.js";
import type { ProfileCompositionDecision } from "../../../model/composition/profile-composition-decision.js";
import type { SourceDocument } from "../../../model/input/job-posting-input.js";

vi.mock("../../../adapters/llm/openai-compatible-client.js", () => ({
  createLlmClient: () => ({
    callLlm: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        adaptations: [
          { index: 1, id: "proj-1", adaptedText: "Steuerung der Plattformmodernisierung." },
        ],
      }),
      tokensUsed: 42,
    }),
  }),
}));

describe("adaptProjectDescriptions", () => {
  const context: PipelineContext = {
    runId: "run-1",
    config: {
      workspace: { runsDir: "runs", sourcesDir: "sources" },
      pipeline: { projectSelection: { targetCount: 5 }, keywordSelection: { targetCount: 10 } },
      llm: {
        provider: "test",
        baseURL: "https://example.com",
        model: "test-model",
        maxTokens: 1000,
        temperature: 0,
      },
    },
    secrets: { apiKey: "test-key" },
    inputs: {
      posting: { raw: "" },
      sources: [],
      steering: { hints: [] },
      targetLanguage: "de",
    },
  };

  const composition: ProfileCompositionDecision = {
    headline: "Senior Cloud Architect",
    sections: [
      { name: "Qualifikationen", mode: "adapted", evidenceRefs: [], sourceItem: "profile" },
    ],
  };

  const sources: SourceDocument[] = [
    {
      type: "profile",
      path: "/tmp/profile.yaml",
      content: {
        skills: [
          { name: "Kubernetes" },
          { name: "Terraform" },
          { name: "AWS" },
        ],
        certifications: ["CKA"],
        languages: [{ language: "Deutsch", level: "Muttersprache" }],
        education: [{ degree: "M.Sc. Informatik", institution: "TU Musterstadt", period: "2014-2016" }],
        workExperience: [{ period: "2020-2024", role: "Cloud Architect", company: "ACME" }],
      },
    },
  ];

  it("should render qualification blocks and keep prioritized keywords from dominating core skills", async () => {
    const result = await adaptProjectDescriptions(
      context,
      composition,
      "Ausschreibung Kubernetes",
      [],
      sources,
      ["Kubernetes", "Deutsch (Muttersprache)"],
    );

    expect(result.tokensUsed).toBe(0);
    expect(result.sections[0].content).toContain("### Kernkompetenzen");
    expect(result.sections[0].content).toMatch(/- Kubernetes\n- Terraform\n- AWS/);
  });

  it("should adapt ranked projects via LLM", async () => {
    const result = await adaptProjectDescriptions(
      context,
      {
        ...composition,
        sections: [
          { name: "Projekterfahrung", mode: "adapted", evidenceRefs: [], sourceItem: "project-history" },
        ],
      },
      "Ausschreibung Plattformmodernisierung",
      ["Fokus auf Plattform"],
      [
        {
          type: "project-history",
          path: "/tmp/projects.yaml",
          content: {
            projects: [
              { id: "proj-1", title: "Migration", description: "Originalbeschreibung" },
            ],
          },
        },
      ],
      [],
      [{ id: "proj-1" }],
    );

    expect(result.tokensUsed).toBe(42);
    expect(result.sections[0].content).toContain("Steuerung der Plattformmodernisierung.");
  });
});
