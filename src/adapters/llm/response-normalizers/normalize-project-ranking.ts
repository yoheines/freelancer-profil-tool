/**
 * Normalisiert die LLM-Antwort für das Projekt-Ranking.
 * Erwartet ein JSON mit einem "rankings"-Array.
 */

import { trimMarkdownBlock } from "../../../shared/text/trim-markdown-block.js";
import { ValidationError } from "../../../shared/errors/app-error.js";

export interface ProjectRankingEntry {
  rank: number;
  id: string;
  title: string;
  rationale: string;
}

interface RawRankingResponse {
  rankings?: Array<{
    rank?: number;
    id?: string;
    title?: string;
    rationale?: string;
  }>;
}

export function normalizeProjectRanking(
  raw: string,
  expectedProjectIds: string[],
  expectedCount: number,
): ProjectRankingEntry[] {
  const cleaned = trimMarkdownBlock(raw);
  let parsed: RawRankingResponse;

  try {
    parsed = JSON.parse(cleaned) as RawRankingResponse;
  } catch {
    throw new ValidationError("Failed to parse project ranking from LLM response", {
      raw: cleaned.slice(0, 500),
    });
  }

  const rankings = (parsed.rankings ?? []).map((r) => ({
    rank: r.rank ?? Number.NaN,
    id: (r.id ?? "").trim(),
    title: (r.title ?? "").trim(),
    rationale: (r.rationale ?? "").trim(),
  }));

  if (rankings.length !== expectedCount) {
    throw new ValidationError("Project ranking has an unexpected number of entries", {
      expectedCount,
      actualCount: rankings.length,
    });
  }

  const rankingIds = rankings.map((entry) => entry.id);
  const duplicateIds = rankingIds.filter((id, index, values) => values.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    throw new ValidationError("Project ranking contains duplicate project IDs", {
      duplicateProjectIds: [...new Set(duplicateIds)],
    });
  }

  const unexpectedIds = rankingIds.filter((id) => !expectedProjectIds.includes(id));
  if (unexpectedIds.length > 0) {
    throw new ValidationError("Project ranking contains unexpected project IDs", {
      unexpectedProjectIds: [...new Set(unexpectedIds)],
      expectedProjectIds,
    });
  }

  const missingIds = expectedProjectIds.length === expectedCount
    ? expectedProjectIds.filter((id) => !rankingIds.includes(id))
    : [];
  if (missingIds.length > 0) {
    throw new ValidationError("Project ranking is incomplete", {
      missingProjectIds: missingIds,
      expectedProjectIds,
    });
  }

  const invalidEntries = rankings.filter((entry) => (
    !Number.isInteger(entry.rank)
    || entry.rank < 1
    || entry.rank > expectedCount
    || entry.title.length === 0
    || entry.rationale.length === 0
  ));
  if (invalidEntries.length > 0) {
    throw new ValidationError("Project ranking contains invalid entries", {
      invalidEntries,
      expectedCount,
    });
  }

  const rankingNumbers = rankings.map((entry) => entry.rank);
  const duplicateRanks = rankingNumbers.filter((rank, index, values) => values.indexOf(rank) !== index);
  if (duplicateRanks.length > 0) {
    throw new ValidationError("Project ranking contains duplicate ranks", {
      duplicateRanks: [...new Set(duplicateRanks)],
    });
  }

  rankings.sort((a, b) => a.rank - b.rank);

  return rankings;
}
