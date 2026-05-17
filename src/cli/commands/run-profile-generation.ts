/**
 * `freelancer-profil-tool run` command.
 * Orchestrates a full pipeline run from CLI arguments.
 */

import { Command } from "commander";
import { runProfilePipeline } from "../../core/pipeline/run-profile-pipeline.js";
import { parseCliOptions } from "../parsers/parse-cli-options.js";
import { renderRunSummary } from "../presenters/render-run-summary.js";
import { renderError } from "../presenters/render-error.js";
import { loadAppConfig } from "../../adapters/config/load-app-config.js";
import { loadSecretsConfig } from "../../adapters/config/load-secrets-config.js";
import type { AppConfig } from "../../model/config/app-config.js";
import type { RunInputs, SourceDocument } from "../../model/input/job-posting-input.js";
import { normalizeProfileLanguage } from "../../shared/i18n/profile-language.js";

export function createRunCommand(): Command {
  const command = new Command("run")
    .description("Run a full profile generation pipeline")
    .requiredOption("-p, --posting <path>", "Path to the job posting text file")
    .option("-s, --sources <paths...>", "Paths to source material files (kommasepariert oder Flag mehrfach verwenden)")
    .option("-t, --steering <hints...>", 'Optional steering hints, e.g. -t "Fokus auf Cloud"')
    .option("-c, --config <path>", "Path to config file (default: config/default.yaml)")
    .option("--top-projects <n>", "Maximale Anzahl gerankter und adaptierter Projekte")
    .option("--language <de|en>", "Zielsprache des Profils (de oder en)")
    .action(async (rawOptions: Record<string, unknown>) => {
      try {
        const options = parseCliOptions(rawOptions);

        // Load configuration
        const config = applyTopProjectsOverride(await loadAppConfig(options.config), options.topProjects);
        const secrets = await loadSecretsConfig();

        // Check for API key
        if (!secrets.apiKey) {
          console.error(
            "❌ No API key found.\n"
            + "  Set it in secrets/secrets.local.yaml or the OPENAI_API_KEY environment variable.\n"
            + "  See secrets/secrets.local.yaml for the format.",
          );
          process.exit(1);
        }

        // Build run inputs from CLI args
        const inputs: RunInputs = {
          posting: { raw: "", sourcePath: options.posting },
          sources: options.sources.map((p: string) => ({
            type: "profile" as const,
            path: p,
            content: {} as Record<string, unknown>,
          })),
          steering: { hints: options.steering ?? [] },
          targetLanguage: normalizeProfileLanguage(options.language),
        };

        console.log(`🚀 Starting profile generation run...\n`);
        console.log(`  Posting: ${options.posting}`);
        if (options.sources.length > 0) {
          console.log(`  Sources: ${options.sources.join(", ")}`);
        }
        if (inputs.steering.hints.length > 0) {
          console.log(`  Steering: ${inputs.steering.hints.join(", ")}`);
        }
        console.log(`  Zielanzahl Projekte: ${config.pipeline.projectSelection.targetCount}`);
        console.log(`  Zielanzahl Keywords: ${config.pipeline.keywordSelection.targetCount}`);
        console.log(`  Profilsprache: ${inputs.targetLanguage}`);
        console.log(`  Model: ${config.llm.model} @ ${config.llm.baseURL}\n`);

        const result = await runProfilePipeline(config, secrets, inputs);

        if (result.ok) {
          console.log(renderRunSummary(result));
        } else {
          console.error(renderError(result));
          process.exit(1);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(`❌ Unexpected error: ${message}`);
        process.exit(1);
      }
    });

  return command;
}

function applyTopProjectsOverride(config: AppConfig, topProjects?: number): AppConfig {
  if (topProjects === undefined) {
    return config;
  }

  if (!Number.isInteger(topProjects) || topProjects < 1) {
    throw new Error("--top-projects muss eine positive ganze Zahl sein");
  }

  return {
    ...config,
    pipeline: {
      ...config.pipeline,
      projectSelection: {
        ...config.pipeline.projectSelection,
        targetCount: topProjects,
      },
    },
  };
}
