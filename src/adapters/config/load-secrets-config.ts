import { parseYamlFile } from "../serialization/parse-yaml-file.js";
import type { SecretsConfig } from "../../model/config/app-config.js";

export async function loadSecretsConfig(path: string = "./secrets/secrets.local.yaml"): Promise<SecretsConfig> {
  const raw = await parseYamlFile<{ apiKey?: string }>(path);
  const apiKey = raw.apiKey || process.env.OPENAI_API_KEY || "";

  return { apiKey };
}
