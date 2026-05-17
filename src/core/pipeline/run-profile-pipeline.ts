/**
 * Pipeline orchestrator.
 * Coordinates sequential execution of all pipeline steps.
 */

import { access } from "node:fs/promises";
import type { PipelineContext } from "./pipeline-context.js";
import type { PipelineResult } from "./pipeline-result.js";
import type { StepTiming } from "../../model/diagnostics/run-diagnostic.js";
import { createRunId } from "../../shared/ids/create-run-id.js";
import type { RunInputs } from "../../model/input/job-posting-input.js";
import type { AppConfig, SecretsConfig } from "../../model/config/app-config.js";
import { ConfigError, ValidationError, PipelineStepError } from "../../shared/errors/app-error.js";
import { loadRunInputs } from "./steps/load-run-inputs.js";
import { planDocumentComposition } from "./steps/plan-document-composition.js";
import { generateProfileHook } from "./steps/generate-profile-hook.js";
import { adaptProjectDescriptions } from "./steps/adapt-project-descriptions.js";
import { composeProfileDraft } from "./steps/compose-profile-draft.js";
import { evaluateDraftDiagnostics } from "./steps/evaluate-draft-diagnostics.js";
import { ensureRunDir, writeIntermediateModel, writeProfileDraft, writeDiagnostics } from "../../adapters/filesystem/write-run-artifacts.js";
import { loadSourceDocuments } from "../../adapters/filesystem/load-source-documents.js";
import { curateSkillKeywords } from "./steps/curate-skill-keywords.js";
import { analyzeRequirementsCoverage } from "./steps/analyze-requirements-coverage.js";
import { rankProjects } from "./steps/rank-projects.js";

export async function runProfilePipeline(
  config: AppConfig,
  secrets: SecretsConfig,
  inputs: RunInputs,
): Promise<PipelineResult> {
  const runId = createRunId();
  const runDir = `${config.workspace.runsDir}/${runId}`;

  // ── Pre-flight validation ──────────────────────────────────
  const postingPath = inputs.posting.sourcePath ?? "";
  if (!postingPath) {
    return {
      ok: false,
      runId,
      error: new ValidationError("No posting file path provided", {
        hint: "Specify a posting file with --posting <path>",
      }),
    };
  }

  try {
    await access(postingPath);
  } catch {
    return {
      ok: false,
      runId,
      error: new ValidationError(`Posting file not found: ${postingPath}`, {
        path: postingPath,
        hint: "Verify the file exists and the path is correct",
      }),
    };
  }

  // Check source files exist
  const sourcePaths = inputs.sources.map((s) => s.path);
  for (const srcPath of sourcePaths) {
    try {
      await access(srcPath);
    } catch {
      return {
        ok: false,
        runId,
        error: new ValidationError(`Source file not found: ${srcPath}`, {
          path: srcPath,
          hint: "Verify the file exists and the path is correct",
        }),
      };
    }
  }

  // Check API key
  if (!secrets.apiKey) {
    return {
      ok: false,
      runId,
      error: new ConfigError("No API key configured", {
        hint: "Set it in secrets/secrets.local.yaml or the OPENAI_API_KEY environment variable",
      }),
    };
  }
  const stepTimings: StepTiming[] = [];
  let totalLlmTokens = 0;
  let totalLlmCalls = 0;

  const context: PipelineContext = {
    runId,
    config,
    secrets,
    inputs,
  };

  // Enable LLM trace logging into the run directory
  process.env.LLM_TRACE_DIR = runDir;

  try {
    // Step 0: Load inputs
    const t0 = Date.now();
    const loadedInputs = await loadRunInputs(context);
    const sources = await loadSourceDocuments(loadedInputs.sourcePaths);
    const projectCount = countProjects(sources);
    if (projectCount === 0) {
      return {
        ok: false,
        runId,
        error: new ValidationError("Keine Projekte in den Quelldateien gefunden", {
          sourcePaths: loadedInputs.sourcePaths,
          hint: "Mindestens eine project-history-Quelle mit mindestens einem Projekt ist erforderlich",
        }),
      };
    }
    stepTimings.push({ name: "load-inputs", durationMs: Date.now() - t0, status: "ok" });

    // Step 1: Analyze requirements coverage (LLM) — erzeugt Requirements-Map für alle Folgeschritte
    const t1 = Date.now();
    const { requirementsMap, tokensUsed: tokens2b } = await analyzeRequirementsCoverage(
      context,
      loadedInputs.postingRaw,
      loadedInputs.steeringHints,
      sources,
    );
    stepTimings.push({ name: "analyze-requirements-coverage", durationMs: Date.now() - t1, status: "ok" });
    totalLlmCalls++;
    totalLlmTokens += tokens2b;

    // Step 2: Curate skill keywords from posting and source data (LLM) — gewichtet mit Requirements-Map
    const t2 = Date.now();
    const { keywords: skillKeywords, tokensUsed: tokens1 } = await curateSkillKeywords(
      context,
      loadedInputs.postingRaw,
      loadedInputs.steeringHints,
      sources,
      requirementsMap,
    );
    stepTimings.push({ name: "curate-skill-keywords", durationMs: Date.now() - t2, status: "ok" });
    totalLlmCalls++;
    totalLlmTokens += tokens1;

    // Step 3: Plan document composition (rule-based)
    const t2b = Date.now();
    const composition = planDocumentComposition(loadedInputs.postingRaw, sources);
    stepTimings.push({ name: "plan-composition", durationMs: Date.now() - t2b, status: "ok" });

    // Step 4: Rank projects by relevance (LLM) — gewichtet mit Requirements-Map
    const t3 = Date.now();
    const { rankings: projectRankings, tokensUsed: tokens3b, llmCallMade } = await rankProjects(
      context,
      loadedInputs.postingRaw,
      loadedInputs.steeringHints,
      sources,
      requirementsMap,
    );
    stepTimings.push({ name: "rank-projects", durationMs: Date.now() - t3, status: "ok" });
    if (llmCallMade) totalLlmCalls++;
    totalLlmTokens += tokens3b;

    // Step 5: Generate profile hook (LLM) — mit Requirements-Map
    const t4a = Date.now();
    const { text: hookText, tokensUsed: tokens4a } = await generateProfileHook(
      context,
      loadedInputs.postingRaw,
      loadedInputs.steeringHints,
      sources,
      requirementsMap,
    );
    stepTimings.push({ name: "generate-profile-hook", durationMs: Date.now() - t4a, status: "ok" });
    totalLlmCalls++;
    totalLlmTokens += tokens4a;

    // Step 6: Adapt project descriptions (LLM batch call for top N) — mit Requirements-Map
    const t4b = Date.now();
    const { sections: adaptedSections, tokensUsed: tokens4b } = await adaptProjectDescriptions(
      context,
      composition,
      loadedInputs.postingRaw,
      loadedInputs.steeringHints,
      sources,
      skillKeywords,
      projectRankings,
      requirementsMap,
    );
    stepTimings.push({ name: "adapt-project-descriptions", durationMs: Date.now() - t4b, status: "ok" });
    totalLlmCalls++;
    totalLlmTokens += tokens4b;

    // Fill generated Einleitung with hook text
    for (const section of adaptedSections) {
      if (section.name === "Einleitung") {
        section.content = hookText;
      }
    }

    // Step 7: Compose draft (deterministic)
    const t5 = Date.now();
    const draft = composeProfileDraft(adaptedSections, composition, skillKeywords, loadedInputs.targetLanguage);
    stepTimings.push({ name: "compose-draft", durationMs: Date.now() - t5, status: "ok" });

    // Step 8: Persist artifacts
    const t6 = Date.now();
    await ensureRunDir(runDir);

    const draftPath = await writeProfileDraft(runDir, draft);
    const intermediatePath = await writeIntermediateModel(runDir, {
      compositionPlan: composition,
      requirementsMap: requirementsMap.entries,
      skillKeywords,
      projectRankings,
      inputs: {
        postingPath: loadedInputs.postingPath,
        sourcePaths: loadedInputs.sourcePaths,
        steeringHints: loadedInputs.steeringHints,
        targetLanguage: loadedInputs.targetLanguage,
      },
    });

    // Build diagnostics separately to avoid TDZ issues with circular ref
    const diagnostics = evaluateDraftDiagnostics({
      composition,
      draft,
      stepTimings,
      llmTokens: totalLlmTokens,
      llmCalls: totalLlmCalls,
      requirementsMap,
      projectRankings,
      outputRefs: { draftPath, intermediatePath, diagnosticsPath: "" },
    });
    let diagnosticsPath = await writeDiagnostics(runDir, diagnostics);
    // Patch diagnostics with real path and re-write
    diagnostics.outputRefs.diagnosticsPath = diagnosticsPath;
    diagnosticsPath = await writeDiagnostics(runDir, diagnostics);

    stepTimings.push({ name: "persist-artifacts", durationMs: Date.now() - t6, status: "ok" });

    const totalDuration = stepTimings.reduce((sum, s) => sum + s.durationMs, 0);

    return {
      ok: true,
      runId,
      draftPath,
      intermediatePath,
      diagnosticsPath,
      summary: `Pipeline completed in ${(totalDuration / 1000).toFixed(1)}s with ${totalLlmCalls} LLM calls.`,
    };
  } catch (err) {
    const error = err instanceof Error
      ? new PipelineStepError("pipeline", err.message, { runId })
      : new PipelineStepError("pipeline", "Unknown pipeline error", { runId });

    return {
      ok: false,
      runId,
      error,
    };
  }
}

function countProjects(sources: RunInputs["sources"]): number {
  return sources.reduce((count, source) => {
    if (source.type !== "project-history") {
      return count;
    }

    const projects = (source.content as { projects?: unknown[] }).projects;
    return count + (Array.isArray(projects) ? projects.length : 0);
  }, 0);
}
