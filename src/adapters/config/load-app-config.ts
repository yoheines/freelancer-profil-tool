import { parseYamlFile } from "../serialization/parse-yaml-file.js";
import type { AppConfig } from "../../model/config/app-config.js";
import { ConfigError } from "../../shared/errors/app-error.js";

export async function loadAppConfig(path: string = "./config/default.yaml"): Promise<AppConfig> {
  const raw = await parseYamlFile<{
    workspace?: { runsDir?: string; sourcesDir?: string };
    pipeline?: { projectSelection?: { targetCount?: number }; keywordSelection?: { targetCount?: number } };
    llm?: { provider?: string; baseURL?: string; model?: string; maxTokens?: number; temperature?: number };
  }>(path);

  const projectTargetCount = raw.pipeline?.projectSelection?.targetCount ?? 5;
  if (!Number.isInteger(projectTargetCount) || projectTargetCount < 1) {
    throw new ConfigError("pipeline.projectSelection.targetCount muss eine positive ganze Zahl sein", {
      path,
      targetCount: projectTargetCount,
    });
  }

  const keywordTargetCount = raw.pipeline?.keywordSelection?.targetCount ?? 10;
  if (!Number.isInteger(keywordTargetCount) || keywordTargetCount < 1) {
    throw new ConfigError("pipeline.keywordSelection.targetCount muss eine positive ganze Zahl sein", {
      path,
      targetCount: keywordTargetCount,
    });
  }

  return {
    workspace: {
      runsDir: raw.workspace?.runsDir ?? "./runs",
      sourcesDir: raw.workspace?.sourcesDir ?? "./sources",
    },
    pipeline: {
      projectSelection: {
        targetCount: projectTargetCount,
      },
      keywordSelection: {
        targetCount: keywordTargetCount,
      },
    },
    llm: {
      provider: raw.llm?.provider ?? "openai-compatible",
      baseURL: raw.llm?.baseURL ?? "https://api.openai.com/v1",
      model: raw.llm?.model ?? "gpt-4o-mini",
      maxTokens: raw.llm?.maxTokens ?? 4096,
      temperature: raw.llm?.temperature ?? 0.3,
    },
  };
}
