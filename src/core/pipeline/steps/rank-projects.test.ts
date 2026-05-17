import { describe, expect, it, vi } from "vitest";
import { rankProjects } from "./rank-projects.js";
import type { PipelineContext } from "../pipeline-context.js";
import type { SourceDocument } from "../../../model/input/job-posting-input.js";

vi.mock("../../../adapters/llm/openai-compatible-client.js", () => ({
  createLlmClient: () => ({
    callLlm: vi.fn().mockImplementation(async ({ userPrompt }: { userPrompt: string }) => {
      const requestedCount = Number.parseInt(userPrompt.match(/EXAKT (\d+) Einträge/)?.[1] ?? "5", 10);
      const rankings = [
        { rank: 1, id: "proj-6", title: "Projekt 6", rationale: "Beste Passung" },
        { rank: 2, id: "proj-5", title: "Projekt 5", rationale: "Gute Passung" },
        { rank: 3, id: "proj-4", title: "Projekt 4", rationale: "Solide" },
        { rank: 4, id: "proj-3", title: "Projekt 3", rationale: "Ausreichend" },
        { rank: 5, id: "proj-2", title: "Projekt 2", rationale: "Grundkenntnisse" },
      ].slice(0, requestedCount);

      return {
        content: JSON.stringify({ rankings }),
        tokensUsed: 100,
      };
    }),
  }),
}));

function makeContext(): PipelineContext {
  return {
    runId: "test-run",
    config: {
      workspace: { runsDir: "runs", sourcesDir: "sources" },
      pipeline: { projectSelection: { targetCount: 5 }, keywordSelection: { targetCount: 10 } },
      llm: { provider: "test", baseURL: "https://example.com", model: "test", maxTokens: 1000, temperature: 0 },
    },
    secrets: { apiKey: "test-key" },
    inputs: { posting: { raw: "" }, sources: [], steering: { hints: [] } },
  };
}

describe("rankProjects", () => {
  it("should throw when no projects are available", async () => {
    await expect(rankProjects(makeContext(), "Ausschreibung", [], [])).rejects.toThrow(/Keine Projekte/);
  });

  it("should skip the LLM when exactly one project exists", async () => {
    const sources: SourceDocument[] = [
      {
        type: "project-history",
        path: "/tmp/projects.yaml",
        content: {
          projects: [
            { id: "p1", title: "Projekt A", description: "Desc A" },
          ],
        },
      },
    ];

    const result = await rankProjects(makeContext(), "Ausschreibung", [], sources);

    expect(result.llmCallMade).toBe(false);
    expect(result.tokensUsed).toBe(0);
    expect(result.rankings.map((entry) => entry.id)).toEqual(["p1"]);
  });

  it("should call the LLM when multiple projects exist", async () => {
    const sources: SourceDocument[] = [
      {
        type: "project-history",
        path: "/tmp/projects.yaml",
        content: {
          projects: Array.from({ length: 6 }, (_, i) => ({
            id: `proj-${i + 1}`,
            title: `Projekt ${i + 1}`,
            description: `Description ${i + 1}`,
          })),
        },
      },
    ];

    const result = await rankProjects(makeContext(), "Ausschreibung", ["Fokus auf Website"], sources);

    expect(result.llmCallMade).toBe(true);
    expect(result.tokensUsed).toBe(100);
    expect(result.rankings).toHaveLength(5);
    expect(result.rankings[0].id).toBe("proj-6");
  });

  it("should honor the configured target count", async () => {
    const sources: SourceDocument[] = [
      {
        type: "project-history",
        path: "/tmp/projects.yaml",
        content: {
          projects: Array.from({ length: 6 }, (_, i) => ({
            id: `proj-${i + 1}`,
            title: `Projekt ${i + 1}`,
            description: `Description ${i + 1}`,
          })),
        },
      },
    ];

    const context = makeContext();
    const result = await rankProjects({
      ...context,
      config: {
        ...context.config,
        pipeline: { projectSelection: { targetCount: 3 }, keywordSelection: { targetCount: 10 } },
      },
    }, "Ausschreibung", [], sources);

    expect(result.rankings).toHaveLength(3);
  });
});
