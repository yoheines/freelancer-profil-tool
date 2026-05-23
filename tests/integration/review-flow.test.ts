/**
 * Integrationstest: Review-Flow (analyze-requirements-coverage → HTML-Report).
 *
 * Prüft:
 * - LLM wird gemockt, liefert eine realistische Requirements-Map
 * - `analyzeRequirementsCoverage()` wird mit echten Fixture-Daten ausgeführt
 * - `renderReviewHtml()` erzeugt einen vollständigen HTML-Report
 * - Die HTML-Ausgabe enthält die erwarteten Sektionen, Keywords und Metadaten
 * - Die CLI-Summary (via summarizeRequirementsFit) ist kompakt
 */

import { describe, expect, it, vi, beforeAll } from "vitest";
import { mkdtempSync, mkdirSync, cpSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// LLM-Client mocken
vi.mock("../../src/adapters/llm/openai-compatible-client.js", () => ({
  createLlmClient: () => ({
    callLlm: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        entries: [
          {
            requirement: "Product Ownership",
            priority: "hoch",
            coverage: "gut_belegt",
            evidenceType: "projekt",
            keyEvidence: "Relaunch Online-Kundenportal (proj-portal-relaunch)",
            reasoning:
              "Mehrere Projekte mit expliziter Product-Ownership-Rolle; direkte Evidenz.",
            suggestedEvidence: "",
            suggestedSourceLocation: "",
            gapPriority: "",
          },
          {
            requirement: "Conversational AI / Chatbot",
            priority: "hoch",
            coverage: "unbelegt",
            evidenceType: "keine",
            keyEvidence: "",
            reasoning:
              "Keine Projekt- oder Profilinformationen zu Conversational AI gefunden.",
            suggestedEvidence:
              "Projekt mit Chatbot-Integration oder Conversational-AI-Bezug ergänzen.",
            suggestedSourceLocation: "projektbeschreibung",
            gapPriority: "hoch",
          },
          {
            requirement: "Scrum / Agile Methoden",
            priority: "hoch",
            coverage: "gut_belegt",
            evidenceType: "projekt",
            keyEvidence: "Agile Transformation IT-Abteilung (proj-agile-transformation)",
            reasoning:
              "Scrum wird in mehreren Projekten genannt, zusätzlich Zertifikate.",
            suggestedEvidence: "",
            suggestedSourceLocation: "",
            gapPriority: "",
          },
          {
            requirement: "KPI-Reporting / Web-Analytics",
            priority: "mittel",
            coverage: "schwach_gestuetzt",
            evidenceType: "indirekt",
            keyEvidence: "Aufbau KPI- & Reporting-Framework (proj-kpi-framework)",
            reasoning:
              "Ein Projekt beschreibt KPI-Aufbau; Web-Analytics taucht als Skill auf.",
            suggestedEvidence: "KPI-Kompetenz in der Summary deutlicher hervorheben.",
            suggestedSourceLocation: "summary",
            gapPriority: "mittel",
          },
        ],
      }),
      tokensUsed: 456,
    }),
  }),
}));

import { analyzeRequirementsCoverage } from "../../src/core/pipeline/steps/analyze-requirements-coverage.js";
import { summarizeRequirementsFit } from "../../src/shared/analysis/summarize-requirements-fit.js";
import { renderReviewHtml, reviewHtmlPath } from "../../src/cli/presenters/render-review-html.js";
import { loadSourceDocuments } from "../../src/adapters/filesystem/load-source-documents.js";
import { ensureRunDir } from "../../src/adapters/filesystem/write-run-artifacts.js";
import type { PipelineContext } from "../../src/core/pipeline/pipeline-context.js";

const FIXTURES_ROOT = resolve("tests/fixtures");

describe("Review-Flow (Integration)", () => {
  let tmpDir: string;
  let postingPath: string;
  let profilePath: string;
  let projectsPath: string;

  beforeAll(() => {
    // Temporäres Verzeichnis mit Fixture-Kopien anlegen
    tmpDir = mkdtempSync(join(tmpdir(), "review-int-test-"));
    mkdirSync(join(tmpDir, "job-postings"), { recursive: true });
    mkdirSync(join(tmpDir, "profile-sources"), { recursive: true });
    mkdirSync(join(tmpDir, "project-histories"), { recursive: true });

    cpSync(
      join(FIXTURES_ROOT, "job-postings", "product-owner-insurance.txt"),
      join(tmpDir, "job-postings", "product-owner-insurance.txt"),
    );
    cpSync(
      join(FIXTURES_ROOT, "profile-sources", "example-profil.yaml"),
      join(tmpDir, "profile-sources", "example-profil.yaml"),
    );
    cpSync(
      join(FIXTURES_ROOT, "project-histories", "example-projekte.yaml"),
      join(tmpDir, "project-histories", "example-projekte.yaml"),
    );

    postingPath = join(tmpDir, "job-postings", "product-owner-insurance.txt");
    profilePath = join(tmpDir, "profile-sources", "example-profil.yaml");
    projectsPath = join(tmpDir, "project-histories", "example-projekte.yaml");
  });

  it("sollte analyzeRequirementsCoverage mit Fixtures ausführen und eine Requirements-Map liefern", async () => {
    const context: PipelineContext = {
      runId: "integration-review-test",
      config: {
        workspace: { runsDir: join(tmpDir, "runs"), sourcesDir: tmpDir },
        pipeline: { projectSelection: { targetCount: 3 }, keywordSelection: { targetCount: 9 } },
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
        posting: { raw: "", sourcePath: postingPath },
        sources: [{ type: "profile", path: profilePath, content: {} }],
        steering: { hints: [] },
      },
    };

    // Ausschreibungstext laden
    const { readFileSync } = await import("node:fs");
    const postingRaw = readFileSync(postingPath, "utf-8");

    // Quellen laden
    const sources = await loadSourceDocuments([profilePath, projectsPath]);

    const { requirementsMap, tokensUsed } = await analyzeRequirementsCoverage(
      context,
      postingRaw,
      [],
      sources,
    );

    // Erwartete Struktur
    expect(requirementsMap.entries).toHaveLength(4);
    expect(requirementsMap.entries[0].requirement).toBe("Product Ownership");
    expect(requirementsMap.entries[0].coverage).toBe("gut_belegt");
    expect(requirementsMap.entries[1].coverage).toBe("unbelegt");
    expect(tokensUsed).toBe(456);

    // Fit-Summary
    const fitSummary = summarizeRequirementsFit(requirementsMap.entries);
    expect(fitSummary.total).toBe(4);
    expect(fitSummary.byCoverage.gut_belegt).toBe(2);
    expect(fitSummary.byCoverage.schwach_gestuetzt).toBe(1);
    expect(fitSummary.byCoverage.unbelegt).toBe(1);
    expect(fitSummary.criticalGaps).toBe(1);

    // Die kompakte Summary enthält alle relevanten Kennzahlen
    expect(fitSummary.overallAssessment).toBeTruthy();
  });

  it("sollte einen vollständigen HTML-Report rendern und schreiben", async () => {
    const runId = "integration-review-html";
    const runDir = join(tmpDir, "runs", runId);
    await ensureRunDir(runDir);

    // Context und Daten wie im ersten Test aufbereiten
    const context: PipelineContext = {
      runId,
      config: {
        workspace: { runsDir: join(tmpDir, "runs"), sourcesDir: tmpDir },
        pipeline: { projectSelection: { targetCount: 3 }, keywordSelection: { targetCount: 9 } },
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
        posting: { raw: "", sourcePath: postingPath },
        sources: [{ type: "profile", path: profilePath, content: {} }],
        steering: { hints: [] },
      },
    };

    const { readFileSync, writeFileSync: wfs } = await import("node:fs");
    const postingRaw = readFileSync(postingPath, "utf-8");
    const sources = await loadSourceDocuments([profilePath, projectsPath]);

    const { requirementsMap, tokensUsed } = await analyzeRequirementsCoverage(
      context,
      postingRaw,
      [],
      sources,
    );

    const fitSummary = summarizeRequirementsFit(requirementsMap.entries);

    // HTML rendern
    const html = renderReviewHtml({
      runId,
      postingPath,
      sourcePaths: [profilePath, projectsPath],
      steeringHints: [],
      requirementsMap: requirementsMap.entries,
      fitSummary,
      llmTokens: tokensUsed,
    });

    // HTML schreiben (wie der echte Command)
    const htmlPath = join(tmpDir, "runs", runId, "review.html");
    wfs(htmlPath, html, "utf-8");

    // HTML existiert
    expect(existsSync(htmlPath)).toBe(true);

    // HTML-Inhalte prüfen
    expect(html).toContain("Preflight-Analyse");
    expect(html).toContain("Product Ownership");
    expect(html).toContain("Conversational AI / Chatbot");
    expect(html).toContain("Scrum");
    expect(html).toContain("KPI-Reporting");
    expect(html).toContain("gut_belegt");
    expect(html).toContain("unbelegt");
    expect(html).toContain("schwach_gestuetzt");
    expect(html).toContain("Requirements-Fit");
    expect(html).toContain("Eingaben");
    expect(html).toContain(runId);
    expect(html).toContain("456"); // Tokens als Zahl im Meta-Bereich
  });
});
