/**
 * Pipeline context: the shared state passed through all pipeline steps.
 * Each step reads from and enriches this context.
 */

import type { RunInputs } from "../../model/input/job-posting-input.js";
import type { AppConfig, SecretsConfig } from "../../model/config/app-config.js";

export interface PipelineContext {
  runId: string;
  config: AppConfig;
  secrets: SecretsConfig;
  inputs: RunInputs;
  // Step results are progressively populated
  // (typed via intermediate steps)
}
