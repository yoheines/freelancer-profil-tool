/**
 * Integrationstest: Inspect-Flow (run-meta.yaml → inspect.html).
 *
 * Erzeugt ein künstliches Run-Verzeichnis mit run-meta.yaml,
 * generiert daraus den Inspect-HTML-Report und prüft Inhalte.
 */

import { describe, expect, it, beforeAll } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stringify as stringifyYaml } from "yaml";
import { renderInspectHtml, inspectHtmlPath } from "../../src/cli/presenters/render-inspect-html.js";

function buildFakeRunMeta(runId: string) {
  return {
    runMetadata: {
      runId,
      createdAt: "2026-05-23T10:00:00.000Z",
    },
    inputs: {
      postingPath: "tests/fixtures/job-postings/product-owner-insurance.txt",
      sourcePaths: [
        "tests/fixtures/profile-sources/example-profil.yaml",
        "tests/fixtures/project-histories/example-projekte.yaml",
      ],
      steeringHints: ["Fokus auf Self-Service"],
      targetLanguage: "de",
    },
    compositionPlan: {
      headline: "Digital Product Owner & Senior IT-Projektmanager",
      sections: [
        { name: "Einleitung", mode: "generated", evidenceRefs: [] },
        { name: "Projekterfahrung", mode: "adapted", evidenceRefs: [], sourceItem: "project-history" },
        { name: "Qualifikationen", mode: "adapted", evidenceRefs: [], sourceItem: "profile" },
        { name: "Kontaktdaten", mode: "static", evidenceRefs: [] },
      ],
    },
    requirementsMap: [
      {
        requirement: "Scrum / Agile Methoden",
        priority: "hoch",
        coverage: "gut_belegt",
        evidenceType: "projekt",
        keyEvidence: "Agile Transformation IT-Abteilung",
        reasoning: "Scrum wird in mehreren Projekten genannt, zusätzlich Zertifikate.",
      },
      {
        requirement: "Conversational AI / Chatbot",
        priority: "niedrig",
        coverage: "unbelegt",
        evidenceType: "keine",
        keyEvidence: "",
        reasoning: "Keine Projekterfahrung zu Conversational AI gefunden.",
        suggestedEvidence: "Projekt mit Chatbot-Bezug ergänzen.",
        suggestedSourceLocation: "projektbeschreibung",
        gapPriority: "niedrig",
      },
    ],
    skillKeywords: [
      "Produktmanagement",
      "Scrum",
      "Stakeholder-Management",
      "Kundenportal",
    ],
    projectRankings: [
      { rank: 1, id: "proj-portal-relaunch", title: "Relaunch Online-Kundenportal", rationale: "Beste Passung auf Portal-Thematik." },
      { rank: 2, id: "proj-selfservice-strategie", title: "Self-Service-Strategie & Produkt-Roadmap", rationale: "Self-Service und Roadmapping sind Kernanforderungen." },
    ],
    diagnostics: {
      totalDurationMs: 24500,
      steps: [
        { name: "load-inputs", durationMs: 5, status: "ok" },
        { name: "analyze-requirements-coverage", durationMs: 4200, status: "ok" },
        { name: "curate-skill-keywords", durationMs: 3100, status: "ok" },
        { name: "plan-composition", durationMs: 1, status: "ok" },
        { name: "rank-projects", durationMs: 3800, status: "ok" },
        { name: "generate-profile-hook", durationMs: 4500, status: "ok" },
        { name: "adapt-project-descriptions", durationMs: 5200, status: "ok" },
        { name: "compose-yaml", durationMs: 2, status: "ok" },
        { name: "persist-artifacts", durationMs: 10, status: "ok" },
      ],
      structuralWeaknesses: [
        {
          type: "unsupported_requirement",
          requirement: "Conversational AI / Chatbot",
          severity: "info",
          message: "Conversational AI / Chatbot: Keine Evidenz in den Quellen.",
        },
      ],
      refinementSuggestions: [
        {
          requirementId: "Conversational AI / Chatbot",
          type: "expand_project",
          message: "Conversational AI / Chatbot → Projekt mit Chatbot-Bezug ergänzen. (Zielort: projektbeschreibung)",
        },
      ],
      compositionSummary: {
        totalSections: 4,
        staticCount: 1,
        adaptedCount: 2,
        generatedCount: 1,
      },
      llmUsage: {
        totalTokens: 8500,
        calls: 5,
      },
      outputRefs: {
        draftPath: `runs/${runId}/profile-draft.yaml`,
      },
    },
  };
}

describe("Inspect-Flow (Integration)", () => {
  let tmpDir: string;
  let runId: string;

  beforeAll(() => {
    runId = "integration-inspect-test";
    tmpDir = mkdtempSync(join(tmpdir(), "inspect-int-test-"));
    const runDir = join(tmpDir, "runs", runId);
    mkdirSync(runDir, { recursive: true });

    // run-meta.yaml schreiben
    const metaData = buildFakeRunMeta(runId);
    writeFileSync(join(runDir, "run-meta.yaml"), stringifyYaml(metaData), "utf-8");
  });

  it("sollte inspect.html aus einem bestehenden Run generieren", async () => {
    // run-meta.yaml laden (wie der echte inspect-Command)
    const { readFileSync } = await import("node:fs");
    const { parse: parseYaml } = await import("yaml");

    const metaPath = join(tmpDir, "runs", runId, "run-meta.yaml");
    const raw = readFileSync(metaPath, "utf-8");
    const meta = parseYaml(raw) as Record<string, unknown>;

    const diagnostics = meta.diagnostics as Record<string, unknown>;

    const inspectData = {
      runId,
      composition: meta.compositionPlan as Record<string, unknown>,
      diagnostics,
      requirementsMap: meta.requirementsMap as unknown[],
      projectRankings: meta.projectRankings as unknown[],
      inputs: meta.inputs as Record<string, unknown>,
    };

    // HTML rendern
    const html = renderInspectHtml(inspectData as Parameters<typeof renderInspectHtml>[0]);

    expect(html).toBeTruthy();
    expect(html).toContain("Run-Analyse");
    expect(html).toContain(runId);
    expect(html).toContain("Relaunch Online-Kundenportal");
    expect(html).toContain("Self-Service-Strategie");
    expect(html).toContain("Scrum / Agile Methoden");
    expect(html).toContain("Conversational AI / Chatbot");
    expect(html).toContain("Pipeline-Schritte");
    expect(html).toContain("load-inputs");
    expect(html).toContain("persist-artifacts");
    expect(html).toContain("5200 ms"); // adapt-project-descriptions
    expect(html).toContain("Kompositionsplan");
    expect(html).toContain("Projekt-Ranking");
    expect(html).toContain("Requirements-Fit");
    expect(html).toContain("Projekterfahrung");
    expect(html).toContain("LLM-Calls");
    expect(html).toContain("8,500"); // Tokens (mit Tausendertrennzeichen)

    // inspect.html in das Run-Verzeichnis schreiben (wie der echte Command)
    const htmlPath = join(tmpDir, "runs", runId, "inspect.html");
    const { writeFileSync: wfs } = await import("node:fs");
    wfs(htmlPath, html, "utf-8");

    expect(existsSync(htmlPath)).toBe(true);
  });

  it("sollte auch mit leeren Rankings und Metadaten stabil bleiben", async () => {
    const minimalData = {
      runId: "minimal-inspect",
      composition: {
        headline: "Minimal",
        sections: [],
      },
      diagnostics: {
        totalDurationMs: 0,
        steps: [],
        structuralWeaknesses: [],
        refinementSuggestions: [],
        compositionSummary: { totalSections: 0, staticCount: 0, adaptedCount: 0, generatedCount: 0 },
        llmUsage: { totalTokens: 0, calls: 0 },
        outputRefs: { draftPath: "" },
      },
      projectRankings: [],
      inputs: undefined,
    };

    const html = renderInspectHtml(minimalData as Parameters<typeof renderInspectHtml>[0]);
    expect(html).toContain("Run-Analyse");
    expect(html).toContain("minimal-inspect");
    expect(html).toContain("Kein Projekt-Ranking vorhanden.");
  });
});
