/**
 * Optionaler E2E-Smoke-Test mit echtem LLM.
 *
 * Nur aktiv, wenn die Umgebungsvariable RUN_E2E_LLM_TESTS=1 gesetzt ist.
 * Erfordert einen gültigen API-Key in secrets/secrets.local.yaml
 * oder in der Umgebungsvariable OPENAI_API_KEY.
 *
 * Start:
 *   RUN_E2E_LLM_TESTS=1 npx vitest run tests/e2e/
 *
 * Oder zusammen mit allen Tests:
 *   RUN_E2E_LLM_TESTS=1 npm test
 *
 * Der Test führt review und/oder run mit echten Fixture-Daten und
 * einem echten LLM-Aufruf aus und prüft grundlegende Smoke-Kriterien:
 * - Exit erfolgreich (kein Fehler)
 * - Artefakte existieren
 * - Grundstruktur der Ergebnisse ist plausibel
 */

import { describe, expect, it, beforeAll } from "vitest";
import { mkdtempSync, mkdirSync, cpSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";

const RUN_E2E = process.env.RUN_E2E_LLM_TESTS === "1";
const describeIf = RUN_E2E ? describe : describe.skip;

const FIXTURES_ROOT = resolve("tests/fixtures");

describeIf("E2E: LLM-Smoke-Tests", () => {
  let tmpDir: string;
  let postingPath: string;
  let profilePath: string;
  let projectsPath: string;
  let runsDir: string;
  let apiKey: string;

  beforeAll(async () => {
    // Temporäres Verzeichnis anlegen
    tmpDir = mkdtempSync(join(tmpdir(), "e2e-llm-test-"));
    runsDir = join(tmpDir, "runs");
    mkdirSync(runsDir, { recursive: true });

    // Fixtures kopieren
    postingPath = join(tmpDir, "posting.txt");
    profilePath = join(tmpDir, "profil.yaml");
    projectsPath = join(tmpDir, "projekte.yaml");

    cpSync(join(FIXTURES_ROOT, "job-postings", "product-owner-insurance.txt"), postingPath);
    cpSync(join(FIXTURES_ROOT, "profile-sources", "example-profil.yaml"), profilePath);
    cpSync(join(FIXTURES_ROOT, "project-histories", "example-projekte.yaml"), projectsPath);

    // API-Key ermitteln
    const { loadSecretsConfig } = await import("../../src/adapters/config/load-secrets-config.js");
    const secrets = await loadSecretsConfig();
    apiKey = secrets.apiKey;

    if (!apiKey) {
      throw new Error(
        "Kein API-Key gefunden. Setze OPENAI_API_KEY oder konfiguriere secrets/secrets.local.yaml.",
      );
    }
  });

  it("sollte review mit echtem LLM erfolgreich ausführen (1 LLM-Call)", async () => {
    const { loadAppConfig } = await import("../../src/adapters/config/load-app-config.js");
    const { analyzeRequirementsCoverage } = await import(
      "../../src/core/pipeline/steps/analyze-requirements-coverage.js"
    );
    const { loadSourceDocuments } = await import(
      "../../src/adapters/filesystem/load-source-documents.js"
    );
    const { summarizeRequirementsFit } = await import(
      "../../src/shared/analysis/summarize-requirements-fit.js"
    );
    const { renderReviewHtml } = await import(
      "../../src/cli/presenters/render-review-html.js"
    );
    const { ensureRunDir } = await import(
      "../../src/adapters/filesystem/write-run-artifacts.js"
    );

    const config = await loadAppConfig();
    const secrets = { apiKey };

    // Ausschreibung lesen
    const postingRaw = readFileSync(postingPath, "utf-8");
    const sources = await loadSourceDocuments([profilePath, projectsPath]);

    // Kontext bauen
    const context = {
      runId: "e2e-review-test",
      config,
      secrets,
      inputs: {
        posting: { raw: "", sourcePath: postingPath },
        sources: sources.map((s) => ({ type: s.type, path: s.path, content: {} })),
        steering: { hints: [] },
      },
    };

    // Echter LLM-Call — analyze-requirements-coverage
    const { requirementsMap, tokensUsed } = await analyzeRequirementsCoverage(
      context as Parameters<typeof analyzeRequirementsCoverage>[0],
      postingRaw,
      [],
      sources,
    );

    // Smoke-Prüfungen
    expect(requirementsMap.entries.length).toBeGreaterThanOrEqual(3);
    expect(tokensUsed).toBeGreaterThan(0);

    // Fit-Summary
    const fitSummary = summarizeRequirementsFit(requirementsMap.entries);
    expect(fitSummary.total).toBeGreaterThanOrEqual(3);

    // Erwartete Anforderungen aus der Ausschreibung
    const reqNames = requirementsMap.entries.map((e) => e.requirement);
    expect(reqNames.some((r) => r.toLowerCase().includes("product"))).toBe(true);
    expect(reqNames.some((r) => r.toLowerCase().includes("scrum"))).toBe(true);

    // HTML-Report schreiben
    const runId = "e2e-review-result";
    const runDir = join(runsDir, runId);
    await ensureRunDir(runDir);

    const html = renderReviewHtml({
      runId,
      postingPath,
      sourcePaths: [profilePath, projectsPath],
      steeringHints: [],
      requirementsMap: requirementsMap.entries,
      fitSummary,
      llmTokens: tokensUsed,
    });

    const htmlPath = join(runDir, "review.html");
    const { writeFileSync } = await import("node:fs");
    writeFileSync(htmlPath, html, "utf-8");

    // HTML existiert und ist plausibel
    expect(existsSync(htmlPath)).toBe(true);
    expect(html.length).toBeGreaterThan(1000);
    expect(html).toContain("Preflight-Analyse");
    expect(html).toContain("Requirements-Fit");
  }, 120000); // Timeout: 2 Minuten für den echten LLM-Call

  it("sollte die vollständige Pipeline mit echtem LLM durchlaufen", async () => {
    const { loadAppConfig } = await import("../../src/adapters/config/load-app-config.js");
    const { runProfilePipeline } = await import("../../src/core/pipeline/run-profile-pipeline.js");

    const config = await loadAppConfig();
    const secrets = { apiKey };

    // runsDir in Config überschreiben
    const testConfig = {
      ...config,
      workspace: { runsDir, sourcesDir: tmpDir },
    };

    const inputs = {
      posting: { raw: "", sourcePath: postingPath },
      sources: [
        { type: "profile" as const, path: profilePath, content: {} },
        { type: "project-history" as const, path: projectsPath, content: { projects: [] } },
      ],
      steering: { hints: [] },
      targetLanguage: "de",
    };

    const result = await runProfilePipeline(testConfig, secrets, inputs);

    // Smoke-Prüfungen
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.runId).toBeTruthy();
    expect(result.summary).toContain("Pipeline completed");

    // Artefakte
    const runDir = join(runsDir, result.runId);
    const yamlPath = join(runDir, "profile-draft.yaml");
    const metaPath = join(runDir, "run-meta.yaml");

    expect(existsSync(yamlPath)).toBe(true);
    expect(existsSync(metaPath)).toBe(true);

    // profile-draft.yaml parsen
    const yamlRaw = readFileSync(yamlPath, "utf-8");
    const yamlData = parseYaml(yamlRaw) as Record<string, unknown>;

    expect(yamlData.summary).toBeTruthy();
    expect(typeof yamlData.summary).toBe("string");
    expect((yamlData.summary as string).length).toBeGreaterThan(50);
    expect(Array.isArray(yamlData.skills)).toBe(true);
    expect((yamlData.skills as string[]).length).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(yamlData.projects)).toBe(true);
    expect((yamlData.projects as unknown[]).length).toBeGreaterThanOrEqual(1);

    // run-meta.yaml parsen
    const metaRaw = readFileSync(metaPath, "utf-8");
    const metaData = parseYaml(metaRaw) as Record<string, unknown>;

    expect(metaData.diagnostics).toBeTruthy();
    const diagnostics = metaData.diagnostics as Record<string, unknown>;
    const llmUsage = diagnostics.llmUsage as Record<string, unknown>;
    expect(llmUsage.calls).toBeGreaterThanOrEqual(4); // 4-5 LLM-Calls
    expect(llmUsage.totalTokens).toBeGreaterThan(0);
  }, 300000); // Timeout: 5 Minuten für die ganze Pipeline
});
