import OpenAI from "openai";
import { appendFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { LlmConfig, SecretsConfig } from "../../model/config/app-config.js";
import { LlmError } from "../../shared/errors/app-error.js";

export interface LlmCallOptions {
  systemPrompt: string;
  userPrompt: string;
  maxTokens?: number;
  temperature?: number;
  /** Optional label to identify this call in the trace log (e.g. "analyze-requirements") */
  label?: string;
}

export interface LlmCallResult {
  content: string;
  tokensUsed: number;
}

let callCounter = 0;

export function createLlmClient(
  config: LlmConfig,
  secrets: SecretsConfig,
  logDir?: string,
): {
  callLlm: (opts: LlmCallOptions) => Promise<LlmCallResult>;
} {
  const client = new OpenAI({
    apiKey: secrets.apiKey,
    baseURL: config.baseURL,
  });

  const effectiveLogDir = logDir || process.env.LLM_TRACE_DIR || undefined;

  async function callLlm(opts: LlmCallOptions): Promise<LlmCallResult> {
    const callId = ++callCounter;
    const startedAt = new Date().toISOString();

    try {
      const response = await client.chat.completions.create({
        model: config.model,
        messages: [
          { role: "system", content: opts.systemPrompt },
          { role: "user", content: opts.userPrompt },
        ],
        max_tokens: opts.maxTokens ?? config.maxTokens,
        temperature: opts.temperature ?? config.temperature,
      });

      const choice = response.choices[0];
      if (!choice?.message?.content) {
        throw new LlmError("Empty response from LLM", {
          model: config.model,
          finishReason: choice?.finish_reason,
        });
      }

      const result: LlmCallResult = {
        content: choice.message.content,
        tokensUsed: response.usage?.total_tokens ?? 0,
      };

      if (effectiveLogDir) {
        await writeTrace(effectiveLogDir, callId, opts, result, startedAt, new Date().toISOString(), undefined);
      }

      return result;
    } catch (err) {
      const error = err instanceof LlmError ? err : new LlmError("LLM call failed", {
        model: config.model,
        cause: err instanceof Error ? err.message : String(err),
      });

      if (effectiveLogDir) {
        await writeTrace(effectiveLogDir, callId, opts, null, startedAt, new Date().toISOString(), error.message);
      }

      throw error;
    }
  }

  return { callLlm };
}

async function writeTrace(
  logDir: string,
  callId: number,
  opts: LlmCallOptions,
  result: LlmCallResult | null,
  startedAt: string,
  endedAt: string,
  errorMessage: string | undefined,
): Promise<void> {
  try {
    await mkdir(logDir, { recursive: true });

    const traceFile = join(logDir, "llm-traces.yaml");
    const sep = `\n# --- LLM Call #${callId}: ${opts.label ?? "unnamed"} ---\n`;

    const entry = [
      sep,
      `callId: ${callId}`,
      `label: "${opts.label ?? "unnamed"}"`,
      `startedAt: "${startedAt}"`,
      `endedAt: "${endedAt}"`,
      `durationMs: ${Date.parse(endedAt) - Date.parse(startedAt)}`,
      errorMessage ? `error: "${errorMessage}"` : null,
      result ? `tokensUsed: ${result.tokensUsed}` : null,
      "",
      "systemPrompt: |",
      indent(opts.systemPrompt),
      "userPrompt: |",
      indent(opts.userPrompt),
      result ? `response: |` : null,
      result ? indent(result.content) : null,
      "",
    ]
      .filter(Boolean)
      .join("\n");

    await appendFile(traceFile, entry, "utf-8");
  } catch {
    // Silent fail — logging should never break the pipeline
  }
}

function indent(text: string, spaces = 2): string {
  const pad = " ".repeat(spaces);
  return text
    .split("\n")
    .map((line) => `${pad}${line}`)
    .join("\n");
}
