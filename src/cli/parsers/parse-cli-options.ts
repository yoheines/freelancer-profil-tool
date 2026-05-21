/**
 * Parsed CLI options for the `run` command.
 */

export interface CliRunOptions {
  posting: string;
  sources: string[];
  steering?: string[];
  config?: string;
  language?: string;
  pdf?: boolean;
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
    language: raw.language as string | undefined,
    pdf: raw.pdf === true,
  };
}
