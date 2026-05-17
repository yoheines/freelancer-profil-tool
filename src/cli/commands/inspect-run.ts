/**
 * `freelancer-profil-tool inspect <run-id>` command.
 * Zeigt die Ergebnisse eines abgeschlossenen Laufs lesbar an.
 */

import { readFile } from "node:fs/promises";
import { Command } from "commander";
import { parse } from "yaml";
import { renderInspect, type InspectData } from "../presenters/render-inspect.js";
import type { ProfileCompositionDecision } from "../../model/composition/profile-composition-decision.js";
import type { RequirementsMapEntry } from "../../model/coverage/requirements-map.js";
import type { RunDiagnostic } from "../../model/diagnostics/run-diagnostic.js";
import type { ProfileGapAnalysis } from "../../model/review/profile-gap-analysis.js";

const RUNS_DIR = "./runs";

export function createInspectCommand(): Command {
  const command = new Command("inspect")
    .description("Inspect the results of a completed run")
    .argument("<run-id>", "Run ID to inspect (e.g. 20260515-f7fd90)")
    .action(async (runId: string) => {
      try {
        const data = await loadRunData(runId);
        console.log(renderInspect(data));
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`❌ Inspect failed: ${message}`);
        process.exit(1);
      }
    });

  return command;
}

async function loadRunData(runId: string): Promise<InspectData> {
  const runsDir = RUNS_DIR;
  const intermediatePath = `${runsDir}/${runId}/intermediate.yaml`;
  const diagnosticsPath = `${runsDir}/${runId}/diagnostics.yaml`;

  const [intermediateRaw, diagnosticsRaw] = await Promise.all([
    readFile(intermediatePath, "utf-8"),
    readFile(diagnosticsPath, "utf-8"),
  ]);

  const intermediate = parse(intermediateRaw) as Record<string, unknown>;
  const diagnostics = parse(diagnosticsRaw) as RunDiagnostic;

  return {
    runId,
    composition: intermediate.compositionPlan as ProfileCompositionDecision,
    diagnostics,
    requirementsMap: intermediate.requirementsMap as RequirementsMapEntry[] | undefined,
    projectRankings: intermediate.projectRankings as InspectData["projectRankings"],
    gapAnalysis: intermediate.gapAnalysis as ProfileGapAnalysis | undefined,
  };
}
