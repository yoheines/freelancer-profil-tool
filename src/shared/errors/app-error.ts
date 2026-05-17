/**
 * Base error class for all application errors.
 * Each error has a stable machine-readable code and a human-readable message.
 */

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ConfigError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("CONFIG_ERROR", message, details);
    this.name = "ConfigError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("VALIDATION_ERROR", message, details);
    this.name = "ValidationError";
  }
}

export class LlmError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("LLM_ERROR", message, details);
    this.name = "LlmError";
  }
}

export class PipelineStepError extends AppError {
  constructor(
    public readonly step: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super("PIPELINE_STEP_ERROR", message, { ...details, step });
    this.name = "PipelineStepError";
  }
}
