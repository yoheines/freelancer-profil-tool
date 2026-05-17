/**
 * Lädt Prompt-Templates aus dem prompts/-Verzeichnis.
 * Templates sind YAML-Dateien mit system_prompt und user_prompt,
 * die {{PLATZHALTER}} für dynamische Inhalte enthalten.
 * Platzhalter wie {{EVIDENZ_STRATEGIE}} und {{ANALYSE_GRUNDSAETZE}}
 * werden automatisch aus prompts/_shared/<name>.yaml aufgelöst.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { parse } from "yaml";
import { ConfigError } from "../../../shared/errors/app-error.js";

const SHARED_PLACEHOLDERS = ["EVIDENZ_STRATEGIE", "ANALYSE_GRUNDSAETZE"] as const;
type SharedPlaceholder = (typeof SHARED_PLACEHOLDERS)[number];

export interface PromptTemplate {
  system_prompt: string;
  user_prompt: string;
}

const PROMPTS_DIR = resolve(process.cwd(), "prompts");
const SHARED_DIR = resolve(PROMPTS_DIR, "_shared");

/** Einmalig gecachte Shared-Snippets. */
const sharedCache = new Map<SharedPlaceholder, string>();

/** Lädt ein Shared-Snippet aus prompts/_shared/<name>.yaml. */
function loadSharedSnippet(placeholder: SharedPlaceholder): string {
  const fileName = `${placeholder.toLowerCase().replace(/_/g, "-")}.yaml`;
  const path = resolve(SHARED_DIR, fileName);

  if (!existsSync(path)) {
    throw new ConfigError(
      `Shared snippet not found: prompts/_shared/${fileName} (referenced as {{${placeholder}}})`,
    );
  }

  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = parse(raw) as Partial<PromptTemplate>;
    if (typeof parsed.system_prompt !== "string") {
      throw new ConfigError(`Missing 'system_prompt' in prompts/_shared/${fileName}`);
    }
    return parsed.system_prompt;
  } catch (err) {
    if (err instanceof ConfigError) throw err;
    throw new ConfigError(`Failed to load shared snippet: prompts/_shared/${fileName}`, {
      error: String(err),
    });
  }
}

/** Ersetzt alle bekannten {{SHARED_PLATZHALTER}} in einem String. */
function resolveSharedPlaceholders(text: string): string {
  for (const placeholder of SHARED_PLACEHOLDERS) {
    const pattern = `{{${placeholder}}}`;
    if (!text.includes(pattern)) continue;

    if (!sharedCache.has(placeholder)) {
      sharedCache.set(placeholder, loadSharedSnippet(placeholder));
    }
    text = text.replace(new RegExp(`\\{\\{${placeholder}\\}\\}`, "g"), sharedCache.get(placeholder)!);
  }
  return text;
}

/**
 * Lädt ein Prompt-Template aus dem prompts/-Verzeichnis.
 * Ersetzt automatisch bekannte {{SHARED_PLATZHALTER}} (z. B. {{EVIDENZ_STRATEGIE}})
 * durch den Inhalt der entsprechenden Datei aus prompts/_shared/.
 * @param name Dateiname ohne .yaml-Extension (z. B. "04-profile-hook-prompt")
 */
export function loadPromptTemplate(name: string): PromptTemplate {
  const path = resolve(PROMPTS_DIR, `${name}.yaml`);
  try {
    const raw = readFileSync(path, "utf-8");
    const parsed = parse(raw) as Partial<PromptTemplate>;

    if (typeof parsed.system_prompt !== "string") {
      throw new ConfigError(`Missing 'system_prompt' in prompts/${name}.yaml`);
    }
    if (typeof parsed.user_prompt !== "string") {
      throw new ConfigError(`Missing 'user_prompt' in prompts/${name}.yaml`);
    }

    return {
      system_prompt: resolveSharedPlaceholders(parsed.system_prompt),
      user_prompt: resolveSharedPlaceholders(parsed.user_prompt),
    };
  } catch (err) {
    if (err instanceof ConfigError) throw err;
    throw new ConfigError(
      `Failed to load prompt template: prompts/${name}.yaml`,
      { error: String(err) },
    );
  }
}

/**
 * Ersetzt Platzhalter {{NAME}} im Template-String mit den gegebenen Werten.
 * Unbekannte Platzhalter bleiben unverändert.
 */
export function fillTemplate(template: string, variables: Record<string, string>): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }
  return result;
}
