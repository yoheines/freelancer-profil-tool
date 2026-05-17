import { readFile } from "node:fs/promises";
import { parse } from "yaml";
import type { SourceDocument } from "../../model/input/job-posting-input.js";
import { ConfigError } from "../../shared/errors/app-error.js";

export async function loadSourceDocuments(paths: string[]): Promise<SourceDocument[]> {
  const sources: SourceDocument[] = [];

  for (const p of paths) {
    const content = await readFile(p, "utf-8");
    let parsed: Record<string, unknown>;

    try {
      parsed = parse(content) as Record<string, unknown>;
    } catch {
      // If YAML parsing fails, treat as generic text
      sources.push({ type: "profile", path: p, content: { raw: content } });
      continue;
    }

    // Heuristic: if it has a "projects" array, it's project-history
    if (Array.isArray(parsed.projects)) {
      sources.push({ type: "project-history", path: p, content: parsed });
    } else {
      sources.push({ type: "profile", path: p, content: parsed });
    }
  }

  return sources;
}
