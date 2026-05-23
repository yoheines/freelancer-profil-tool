/**
 * Integrationstest: Run-Pipeline (vollständiger Pipeline-Durchlauf).
 *
 * Alle 5 LLM-Calls werden gemockt. Die Pipeline wird mit echten Fixture-Dateien
 * ausgeführt. Prüft:
 * - Pipeline beendet mit ok=true
 * - profile-draft.yaml und run-meta.yaml werden erzeugt
 * - Zentrale Inhalte der Artefakte sind plausibel
 */

import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import { mkdtempSync, mkdirSync, cpSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parse as parseYaml } from "yaml";

// LLM-Client global mocken — alle 5 Pipeline-Schritte werden bedient
vi.mock("../../src/adapters/llm/openai-compatible-client.js", () => ({
  createLlmClient: () => ({
    callLlm: vi.fn().mockImplementation(
      async ({ label }: { label?: string }) => {
        switch (label) {
          case "analyze-requirements-coverage":
            return {
              content: JSON.stringify({
                entries: [
                  {
                    requirement: "Product Ownership",
                    priority: "hoch",
                    coverage: "gut_belegt",
                    evidenceType: "projekt",
                    keyEvidence: "Relaunch Online-Kundenportal",
                    reasoning: "Mehrere Projekte mit Product-Ownership-Rolle.",
                    suggestedEvidence: "",
                    suggestedSourceLocation: "",
                    gapPriority: "",
                  },
                  {
                    requirement: "Scrum / Agile Methoden",
                    priority: "hoch",
                    coverage: "gut_belegt",
                    evidenceType: "projekt",
                    keyEvidence: "Agile Transformation",
                    reasoning: "Scrum wird in mehreren Projekten genannt.",
                    suggestedEvidence: "",
                    suggestedSourceLocation: "",
                    gapPriority: "",
                  },
                  {
                    requirement: "KPI-Reporting",
                    priority: "mittel",
                    coverage: "schwach_gestuetzt",
                    evidenceType: "indirekt",
                    keyEvidence: "KPI-Framework-Projekt",
                    reasoning: "Ein Projekt beschreibt KPI-Aufbau.",
                    suggestedEvidence: "KPI-Kompetenz in der Summary deutlicher hervorheben.",
                    suggestedSourceLocation: "summary",
                    gapPriority: "mittel",
                  },
                  {
                    requirement: "Conversational AI",
                    priority: "niedrig",
                    coverage: "unbelegt",
                    evidenceType: "keine",
                    keyEvidence: "",
                    reasoning: "Keine Evidenz in Quellen.",
                    suggestedEvidence: "Projekt mit Chatbot-Bezug ergänzen.",
                    suggestedSourceLocation: "projektbeschreibung",
                    gapPriority: "niedrig",
                  },
                ],
              }),
              tokensUsed: 100,
            };

          case "curate-skill-keywords":
            return {
              content: [
                "Produktmanagement",
                "Scrum",
                "Stakeholder-Management",
                "Kundenportal",
                "Self-Service",
                "JIRA",
                "Product Ownership",
              ].join("\n"),
              tokensUsed: 50,
            };

          case "rank-projects":
            return {
              content: JSON.stringify({
                rankings: [
                  { rank: 1, id: "proj-portal-relaunch", title: "Relaunch Online-Kundenportal", rationale: "Direkte Überlappung mit Portal-Thematik und Product Ownership." },
                  { rank: 2, id: "proj-selfservice-strategie", title: "Self-Service-Strategie & Produkt-Roadmap", rationale: "Self-Service und Roadmapping sind Kernanforderungen." },
                  { rank: 3, id: "proj-kpi-framework", title: "Aufbau KPI- & Reporting-Framework Kundenportal", rationale: "KPI-Kompetenz wird in der Ausschreibung gefordert." },
                ],
              }),
              tokensUsed: 80,
            };

          case "generate-profile-hook":
            return {
              content:
                "Digital Product Owner mit 15+ Jahren Erfahrung in der Konzeption und Steuerung digitaler Kundenportale im Versicherungs- und Finanzumfeld. Schwerpunkt auf skalierbaren Self-Service-Lösungen, KPI-basierter Steuerung und agiler Produktentwicklung. Sicher in der Abstimmung mit Fachbereich, IT und Vorstandsebene.",
              tokensUsed: 60,
            };

          case "adapt-project-descriptions":
            return {
              content: JSON.stringify({
                adaptations: [
                  {
                    index: 0,
                    id: "proj-portal-relaunch",
                    adaptedText:
                      "Product Ownership und fachliche Projektleitung für den Relaunch des Online-Kundenportals. Steuerung der agilen Entwicklung mit 3 cross-funktionalen Teams. Aufbau eines KPI-Reporting-Frameworks und Einführung von A/B-Testing zur Optimierung der Customer Journey.",
                  },
                  {
                    index: 1,
                    id: "proj-selfservice-strategie",
                    adaptedText:
                      "Entwicklung einer ganzheitlichen Self-Service-Strategie für das Online-Kundenportal mit priorisierter Produkt-Roadmap über 18 Monate. Begleitung der initialen Umsetzungsphase als Product Owner.",
                  },
                  {
                    index: 2,
                    id: "proj-kpi-framework",
                    adaptedText:
                      "Konzeption und Einführung eines umfassenden KPI- und Reporting-Frameworks für das Online-Kundenportal entlang der Customer Journey.",
                  },
                ],
              }),
              tokensUsed: 90,
            };

          default:
            return { content: "{}", tokensUsed: 0 };
        }
      },
    ),
  }),
}));

import { runProfilePipeline } from "../../src/core/pipeline/run-profile-pipeline.js";
import type { AppConfig, SecretsConfig } from "../../src/model/config/app-config.js";
import type { RunInputs } from "../../src/model/input/job-posting-input.js";

const FIXTURES_ROOT = resolve("tests/fixtures");

describe("Run-Pipeline (Integration)", () => {
  let tmpDir: string;
  let postingPath: string;
  let profilePath: string;
  let projectsPath: string;
  let runsDir: string;
  let oldLlmTraceDir: string | undefined;

  beforeAll(() => {
    // LLM_TRACE_DIR sichern
    oldLlmTraceDir = process.env.LLM_TRACE_DIR;

    // Temporäres Verzeichnis anlegen
    tmpDir = mkdtempSync(join(tmpdir(), "run-int-test-"));
    runsDir = join(tmpDir, "runs");
    mkdirSync(runsDir, { recursive: true });

    // Fixtures kopieren
    postingPath = join(tmpDir, "posting.txt");
    profilePath = join(tmpDir, "profil.yaml");
    projectsPath = join(tmpDir, "projekte.yaml");

    cpSync(join(FIXTURES_ROOT, "job-postings", "product-owner-insurance.txt"), postingPath);
    cpSync(join(FIXTURES_ROOT, "profile-sources", "example-profil.yaml"), profilePath);
    cpSync(join(FIXTURES_ROOT, "project-histories", "example-projekte.yaml"), projectsPath);
  });

  afterAll(() => {
    // LLM_TRACE_DIR wiederherstellen
    if (oldLlmTraceDir !== undefined) {
      process.env.LLM_TRACE_DIR = oldLlmTraceDir;
    } else {
      delete process.env.LLM_TRACE_DIR;
    }
  });

  it("sollte die Pipeline mit gemockten LLM-Calls erfolgreich durchlaufen", async () => {
    const config: AppConfig = {
      workspace: { runsDir, sourcesDir: tmpDir },
      pipeline: { projectSelection: { targetCount: 3 }, keywordSelection: { targetCount: 7 } },
      llm: {
        provider: "test",
        baseURL: "https://example.com",
        model: "test-model",
        maxTokens: 1000,
        temperature: 0,
      },
    };

    const secrets: SecretsConfig = { apiKey: "test-key" };

    const inputs: RunInputs = {
      posting: { raw: "", sourcePath: postingPath },
      sources: [
        { type: "profile", path: profilePath, content: {} },
        { type: "project-history", path: projectsPath, content: { projects: [] } },
      ],
      steering: { hints: [] },
      targetLanguage: "de",
    };

    const result = await runProfilePipeline(config, secrets, inputs);

    // Pipeline-Ergebnis prüfen
    expect(result.ok).toBe(true);
    if (!result.ok) return; // TypeScript guard

    expect(result.runId).toBeTruthy();
    expect(result.runId).toMatch(/^\d{8}-[a-f0-9]+$/);
    expect(result.summary).toContain("Pipeline completed");

    // Artefakte existieren
    const runDir = join(runsDir, result.runId);
    const yamlPath = join(runDir, "profile-draft.yaml");
    const metaPath = join(runDir, "run-meta.yaml");

    expect(existsSync(yamlPath)).toBe(true);
    expect(existsSync(metaPath)).toBe(true);

    // profile-draft.yaml parsen und Inhalte prüfen
    const yamlRaw = readFileSync(yamlPath, "utf-8");
    const yamlData = parseYaml(yamlRaw) as Record<string, unknown>;

    expect(yamlData.summary).toBeTruthy();
    expect(yamlData.summary).toContain("Digital Product Owner");
    expect(Array.isArray(yamlData.skills)).toBe(true);
    expect((yamlData.skills as string[]).length).toBeGreaterThanOrEqual(3);
    expect(Array.isArray(yamlData.projects)).toBe(true);
    expect((yamlData.projects as unknown[]).length).toBe(3); // targetCount

    // Projekte haben strukturierte Daten
    const projects = yamlData.projects as Array<Record<string, unknown>>;
    expect(projects[0].title).toBe("Relaunch Online-Kundenportal");
    expect(projects[0].client).toBeTruthy();
    expect(projects[0].description).toBeTruthy();
    expect(projects[0].description).toContain("Product Ownership");

    // run-meta.yaml parsen und Inhalte prüfen
    const metaRaw = readFileSync(metaPath, "utf-8");
    const metaData = parseYaml(metaRaw) as Record<string, unknown>;

    expect(metaData.runMetadata).toBeTruthy();
    expect((metaData.runMetadata as Record<string, unknown>).runId).toBe(result.runId);
    expect(metaData.diagnostics).toBeTruthy();
    expect(metaData.compositionPlan).toBeTruthy();
    expect(metaData.requirementsMap).toBeTruthy();
    expect(metaData.skillKeywords).toBeTruthy();
    expect(metaData.projectRankings).toBeTruthy();

    // Diagnostics prüfen
    const diagnostics = metaData.diagnostics as Record<string, unknown>;
    expect(diagnostics.llmUsage).toBeTruthy();
    const llmUsage = diagnostics.llmUsage as Record<string, unknown>;
    expect(llmUsage.calls).toBe(5); // 5 LLM-Calls
    expect(llmUsage.totalTokens).toBeGreaterThan(0);
  });
});
