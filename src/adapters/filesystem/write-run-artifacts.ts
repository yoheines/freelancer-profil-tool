import { mkdir, writeFile } from "node:fs/promises";
import { stringify } from "yaml";
import type { ProfileDraft } from "../../model/draft/profile-draft.js";
import type { ProfileCompositionDecision } from "../../model/composition/profile-composition-decision.js";
import type { RunDiagnostic } from "../../model/diagnostics/run-diagnostic.js";
import type { ProfileGapAnalysis } from "../../model/review/profile-gap-analysis.js";
import { ValidationError } from "../../shared/errors/app-error.js";
import {
  profileCompositionDecisionSchema,
  intermediateModelSchema,
} from "../../model/schemas/intermediate-schema.js";

export interface RunArtifactPaths {
  runDir: string;
  draftPath: string;
  intermediatePath: string;
  diagnosticsPath: string;
  gapAnalysisPath?: string;
}

export async function ensureRunDir(runDir: string): Promise<void> {
  await mkdir(runDir, { recursive: true });
}

export async function writeIntermediateModel(
  runDir: string,
  data: {
    compositionPlan: ProfileCompositionDecision;
    requirementsMap?: Array<{ requirement: string; priority: string; coverage: string; evidenceType: string; keyEvidence: string }>;
    skillKeywords?: string[];
    projectRankings?: Array<{ rank: number; id: string; title: string; rationale: string }>;
    gapAnalysis?: ProfileGapAnalysis;
    inputs: { postingPath: string; sourcePaths: string[]; steeringHints: string[]; targetLanguage?: string };
  },
): Promise<string> {
  const intermediate: Record<string, unknown> = {
    runMetadata: {
      runId: runDir.split("/").pop(),
      createdAt: new Date().toISOString(),
    },
    inputs: {
      postingPath: data.inputs.postingPath,
      sourcePaths: data.inputs.sourcePaths,
      steeringHints: data.inputs.steeringHints,
      targetLanguage: data.inputs.targetLanguage,
    },
    compositionPlan: data.compositionPlan,
  };

  if (data.requirementsMap && data.requirementsMap.length > 0) {
    intermediate.requirementsMap = data.requirementsMap;
  }

  if (data.skillKeywords && data.skillKeywords.length > 0) {
    intermediate.skillKeywords = data.skillKeywords;
  }

  if (data.projectRankings && data.projectRankings.length > 0) {
    intermediate.projectRankings = data.projectRankings;
  }

  if (data.gapAnalysis) {
    intermediate.gapAnalysis = data.gapAnalysis;
  }

  const compositionResult = profileCompositionDecisionSchema.safeParse(data.compositionPlan);
  if (!compositionResult.success) {
    throw new ValidationError("Composition plan validation failed", {
      issues: compositionResult.error.issues,
    });
  }

  // Validate the full model shape
  const fullResult = intermediateModelSchema.safeParse(intermediate);
  if (!fullResult.success) {
    throw new ValidationError("Intermediate model validation failed", {
      issues: fullResult.error.issues,
    });
  }

  const path = `${runDir}/intermediate.yaml`;
  await writeFile(path, stringify(intermediate), "utf-8");
  return path;
}

export async function writeProfileDraft(runDir: string, draft: ProfileDraft): Promise<string> {
  const path = `${runDir}/profile-draft.md`;
  await writeFile(path, draft.content, "utf-8");
  return path;
}

export async function writeDiagnostics(runDir: string, diagnostics: RunDiagnostic): Promise<string> {
  const path = `${runDir}/diagnostics.yaml`;
  await writeFile(path, stringify(diagnostics), "utf-8");
  return path;
}

export async function writeGapAnalysis(runDir: string, gapAnalysis: ProfileGapAnalysis): Promise<string> {
  const path = `${runDir}/gap-analysis.yaml`;
  await writeFile(path, stringify(gapAnalysis), "utf-8");
  return path;
}
