/**
 * Normalizer für die Batch-Adaption mehrerer Projektbeschreibungen.
 * Erwartet ein JSON-Objekt mit einem "adaptations"-Array.
 */

import { trimMarkdownBlock } from "../../../shared/text/trim-markdown-block.js";
import { ValidationError } from "../../../shared/errors/app-error.js";

interface RawAdaptation {
  index?: number;
  id?: string;
  adaptedText?: string;
}

interface RawBatchResponse {
  adaptations?: RawAdaptation[];
}

export interface BatchAdaptation {
  index: number;
  id: string;
  adaptedText: string;
}

export function normalizeBatchProjectAdaptations(
  raw: string,
  expectedProjectIds: string[],
): BatchAdaptation[] {
  const cleaned = trimMarkdownBlock(raw);
  let parsed: RawBatchResponse;

  try {
    parsed = JSON.parse(cleaned) as RawBatchResponse;
  } catch {
    throw new ValidationError("Failed to parse batch project adaptations from LLM response", {
      raw: cleaned.slice(0, 500),
    });
  }

  const adaptations = parsed.adaptations ?? [];

  const normalized = adaptations.map((a, i) => ({
    index: a.index ?? i + 1,
    id: a.id ?? `project-${i}`,
    adaptedText: (a.adaptedText ?? "").trim(),
  }));

  const normalizedIds = new Set(normalized.map((item) => item.id));
  const missingIds = expectedProjectIds.filter((id) => !normalizedIds.has(id));
  if (missingIds.length > 0) {
    throw new ValidationError("Batch project adaptations are incomplete", {
      missingProjectIds: missingIds,
      expectedProjectIds,
    });
  }

  const duplicateIds = normalized
    .map((item) => item.id)
    .filter((id, index, values) => values.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    throw new ValidationError("Batch project adaptations contain duplicate project IDs", {
      duplicateProjectIds: [...new Set(duplicateIds)],
    });
  }

  const unexpectedIds = normalized
    .map((item) => item.id)
    .filter((id) => !expectedProjectIds.includes(id));
  if (unexpectedIds.length > 0) {
    throw new ValidationError("Batch project adaptations contain unexpected project IDs", {
      unexpectedProjectIds: [...new Set(unexpectedIds)],
      expectedProjectIds,
    });
  }

  const emptyAdaptations = normalized
    .filter((item) => item.adaptedText.length === 0)
    .map((item) => item.id);
  if (emptyAdaptations.length > 0) {
    throw new ValidationError("Batch project adaptations contain empty adapted texts", {
      projectIds: emptyAdaptations,
    });
  }

  return normalized;
}
