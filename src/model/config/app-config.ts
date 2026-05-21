/**
 * Application configuration types.
 * Mirrors the structure of config/default.yaml and secrets/secrets.local.yaml.
 */

export interface AppConfig {
  workspace: WorkspaceConfig;
  pipeline: PipelineConfig;
  llm: LlmConfig;
  pdf?: PdfConfig;
}

export interface WorkspaceConfig {
  runsDir: string;
  sourcesDir: string;
}

export interface PipelineConfig {
  projectSelection: ProjectSelectionConfig;
  keywordSelection: KeywordSelectionConfig;
}

export interface ProjectSelectionConfig {
  targetCount: number;
}

export interface KeywordSelectionConfig {
  targetCount: number;
}

export interface PdfConfig {
  templatePath: string;
}

export interface LlmConfig {
  provider: string;
  baseURL: string;
  model: string;
  maxTokens: number;
  temperature: number;
}

export interface SecretsConfig {
  apiKey: string;
}
