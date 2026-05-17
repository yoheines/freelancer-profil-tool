/**
 * Parsed CLI options for the `run` command.
 */

export interface CliRunOptions {
  posting: string;
  sources: string[];
  steering?: string[];
  config?: string;
  topProjects?: number;
  language?: string;
}

export function parseCliOptions(raw: Record<string, unknown>): CliRunOptions {
  // Commander passes options with camelCase keys
  // sources kann ein String (kommasepariert) oder ein Array (mehrfaches --sources) sein
  const rawSources = raw.sources;
  let sources: string[] = [];

  if (Array.isArray(rawSources)) {
    // Mehrfaches --sources: jedes Element kann auch Kommas enthalten
    for (const item of rawSources) {
      const parts = (item as string).split(",").map((s) => s.trim()).filter(Boolean);
      sources.push(...parts);
    }
  } else if (typeof rawSources === "string") {
    sources = rawSources.split(",").map((s) => s.trim()).filter(Boolean);
  }

  return {
    posting: raw.posting as string,
    sources,
    steering: raw.steering as string[] | undefined,
    config: raw.config as string | undefined,
    topProjects: typeof raw.topProjects === "string"
      ? Number.parseInt(raw.topProjects, 10)
      : typeof raw.topProjects === "number"
        ? raw.topProjects
        : undefined,
    language: raw.language as string | undefined,
  };
}
