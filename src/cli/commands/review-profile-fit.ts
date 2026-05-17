import { access, readFile } from "node:fs/promises";
import { Command } from "commander";
import { loadAppConfig } from "../../adapters/config/load-app-config.js";
import { loadSecretsConfig } from "../../adapters/config/load-secrets-config.js";
import { loadSourceDocuments } from "../../adapters/filesystem/load-source-documents.js";
import { ensureRunDir, writeGapAnalysis } from "../../adapters/filesystem/write-run-artifacts.js";
import type { RunInputs } from "../../model/input/job-posting-input.js";
import type { PipelineContext } from "../../core/pipeline/pipeline-context.js";
import { parseCliOptions } from "../parsers/parse-cli-options.js";
import { analyzeProfileGaps } from "../../core/pipeline/steps/analyze-profile-gaps.js";
import { createRunId } from "../../shared/ids/create-run-id.js";

export function createReviewCommand(): Command {
  return new Command("review")
    .description("Review source material fit before running generation")
    .requiredOption("-p, --posting <path>", "Path to the job posting text file")
    .option("-s, --sources <paths...>", "Paths to source material files (kommasepariert oder Flag mehrfach verwenden)")
    .option("-t, --steering <hints...>", 'Optional steering hints, e.g. -t "Fokus auf Cloud"')
    .option("-c, --config <path>", "Path to config file (default: config/default.yaml)")
    .action(async (rawOptions: Record<string, unknown>) => {
      try {
        const options = parseCliOptions(rawOptions);
        const config = await loadAppConfig(options.config);
        const secrets = await loadSecretsConfig();

        if (!secrets.apiKey) {
          console.error(
            "❌ No API key found.\n"
            + "  Set it in secrets/secrets.local.yaml or the OPENAI_API_KEY environment variable.\n"
            + "  See secrets/secrets.local.yaml for the format.",
          );
          process.exit(1);
        }

        await access(options.posting);
        for (const src of options.sources) {
          await access(src);
        }

        const postingRaw = await readFile(options.posting, "utf-8");
        const sources = await loadSourceDocuments(options.sources);
        const runId = createRunId();
        const runDir = `${config.workspace.runsDir}/${runId}`;
        const inputs: RunInputs = {
          posting: { raw: postingRaw, sourcePath: options.posting },
          sources,
          steering: { hints: options.steering ?? [] },
        };
        const context: PipelineContext = {
          runId,
          config,
          secrets,
          inputs,
        };

        console.log("🔎 Starting profile fit review...\n");
        console.log(`  Posting: ${options.posting}`);
        if (options.sources.length > 0) {
          console.log(`  Sources: ${options.sources.join(", ")}`);
        }
        if ((options.steering ?? []).length > 0) {
          console.log(`  Steering: ${(options.steering ?? []).join(", ")}`);
        }
        console.log(`  Model: ${config.llm.model} @ ${config.llm.baseURL}\n`);

        const { gapAnalysis, tokensUsed } = await analyzeProfileGaps(
          context,
          postingRaw,
          options.steering ?? [],
          sources,
        );

        await ensureRunDir(runDir);
        const gapAnalysisPath = await writeGapAnalysis(runDir, gapAnalysis);

        console.log(`✅ Review ${runId} completed successfully.\n`);
        console.log(`  Gesamtbewertung: ${gapAnalysis.overallAssessment}`);
        console.log(`  Findings: ${gapAnalysis.findings.length}`);
        console.log(`  Tokens: ${tokensUsed.toLocaleString()}`);
        console.log(`  Gap-Analyse: ${gapAnalysisPath}`);

        if (gapAnalysis.findings.length > 0) {
          console.log("\n  Wichtigste Hinweise:");
          for (const finding of gapAnalysis.findings.slice(0, 5)) {
            const gapTag = finding.gapPriority ? ` · Lücke: ${finding.gapPriority.toUpperCase()}` : "";
            console.log(`  - [${finding.priority.toUpperCase()}${gapTag}] ${finding.requirement} (${finding.status})`);
            console.log(`    ${finding.reasoning}`);
            if (finding.suggestedEvidence) console.log(`    Hilfreiche Evidenz: ${finding.suggestedEvidence}`);
            console.log(`    Zielort: ${finding.suggestedSourceLocation}`);
          }
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`❌ Review failed: ${message}`);
        process.exit(1);
      }
    });
}
