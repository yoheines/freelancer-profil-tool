import { readFile } from "node:fs/promises";
import type { PipelineContext } from "../pipeline-context.js";
import { loadSourceDocuments } from "../../../adapters/filesystem/load-source-documents.js";

export interface LoadedInputs {
  postingRaw: string;
  postingPath: string;
  sourcePaths: string[];
  steeringHints: string[];
  targetLanguage: string;
}

export async function loadRunInputs(context: PipelineContext): Promise<LoadedInputs> {
  const postingPath = context.inputs.posting.sourcePath ?? "";
  const postingRaw = await readFile(postingPath, "utf-8");

  const sourcePaths = context.inputs.sources.map((s) => s.path);

  return {
    postingRaw,
    postingPath,
    sourcePaths,
    steeringHints: context.inputs.steering.hints,
    targetLanguage: context.inputs.targetLanguage ?? "de",
  };
}
