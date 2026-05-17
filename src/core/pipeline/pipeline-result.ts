/**
 * Final pipeline result returned after all steps complete.
 */

import type { AppError } from "../../shared/errors/app-error.js";

export interface PipelineSuccess {
  ok: true;
  runId: string;
  draftPath: string;
  intermediatePath: string;
  diagnosticsPath: string;
  summary: string;
}

export interface PipelineFailure {
  ok: false;
  runId: string;
  error: AppError;
}

export type PipelineResult = PipelineSuccess | PipelineFailure;
