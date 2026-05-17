import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import { ConfigError } from "../../shared/errors/app-error.js";

export async function parseYamlFile<T = Record<string, unknown>>(path: string): Promise<T> {
  let content: string;
  try {
    content = await readFile(path, "utf-8");
  } catch (err) {
    throw new ConfigError(`Cannot read file: ${path}`, {
      path,
      cause: err instanceof Error ? err.message : String(err),
    });
  }

  try {
    const parsed = parse(content) as T;
    return parsed;
  } catch (err) {
    throw new ConfigError(`Invalid YAML in: ${path}`, {
      path,
      cause: err instanceof Error ? err.message : String(err),
    });
  }
}
