import { mkdir, writeFile } from "node:fs/promises";
import { stringify } from "yaml";
import type { ProfileYamlData } from "../../model/draft/profile-draft.js";
import type { ProfileCompositionDecision } from "../../model/composition/profile-composition-decision.js";
import type { RequirementsMapEntry } from "../../model/coverage/requirements-map.js";
import type { RunDiagnostic } from "../../model/diagnostics/run-diagnostic.js";

export async function ensureRunDir(runDir: string): Promise<void> {
  await mkdir(runDir, { recursive: true });
}

// ── profile-draft.yaml ───────────────────────────────────────────────────

export async function writeProfileDraft(
  runDir: string,
  yamlData: ProfileYamlData,
): Promise<string> {
  const yamlPath = `${runDir}/profile-draft.yaml`;
  await writeFile(yamlPath, stringify(yamlData), "utf-8");
  return yamlPath;
}

// ── run-meta.yaml (ersetzt intermediate.yaml + diagnostics.yaml) ──────────

export interface RunMetaInput {
  runId: string;
  createdAt: string;
  inputs: {
    postingPath: string;
    sourcePaths: string[];
    steeringHints: string[];
    targetLanguage?: string;
  };
  compositionPlan: ProfileCompositionDecision;
  requirementsMap?: RequirementsMapEntry[];
  skillKeywords?: string[];
  projectRankings?: Array<{
    rank: number;
    id: string;
    title: string;
    rationale: string;
  }>;
  diagnostics: RunDiagnostic;
}

export async function writeRunMeta(
  runDir: string,
  data: RunMetaInput,
): Promise<string> {
  const runMeta: Record<string, unknown> = {
    runMetadata: {
      runId: data.runId,
      createdAt: data.createdAt,
    },
    inputs: { ...data.inputs },
    compositionPlan: data.compositionPlan,
  };

  if (data.requirementsMap && data.requirementsMap.length > 0) {
    runMeta.requirementsMap = data.requirementsMap;
  }
  if (data.skillKeywords && data.skillKeywords.length > 0) {
    runMeta.skillKeywords = data.skillKeywords;
  }
  if (data.projectRankings && data.projectRankings.length > 0) {
    runMeta.projectRankings = data.projectRankings;
  }
  runMeta.diagnostics = data.diagnostics;

  const path = `${runDir}/run-meta.yaml`;
  await writeFile(path, stringify(runMeta), "utf-8");
  return path;
}
