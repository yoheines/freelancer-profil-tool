/**
 * Renders a human-readable inspection of a completed run.
 * Liest intermediate.yaml und diagnostics.yaml und zeigt:
 * - Run-Info
 * - Anforderungen mit Prioritäten und Evidenz
 * - Kompositionsmodi
 * - Diagnostics/Warnungen
 */

import type { ProfileCompositionDecision } from "../../model/composition/profile-composition-decision.js";
import type { RequirementsMapEntry } from "../../model/coverage/requirements-map.js";
import type { RunDiagnostic } from "../../model/diagnostics/run-diagnostic.js";
import type { ProfileGapAnalysis } from "../../model/review/profile-gap-analysis.js";

export interface InspectData {
  runId: string;
  composition: ProfileCompositionDecision;
  diagnostics: RunDiagnostic;
  requirementsMap?: RequirementsMapEntry[];
  gapAnalysis?: ProfileGapAnalysis;
  projectRankings?: Array<{
    rank: number;
    id: string;
    title: string;
    rationale: string;
  }>;
}

export function renderInspect(data: InspectData): string {
  const lines: string[] = [];

  // ── Header ─────────────────────────────────────────────
  lines.push(`═ ${"═".repeat(60)}`);
  lines.push(`  Inspect Run: ${data.runId}`);
  lines.push(`═ ${"═".repeat(60)}`);
  lines.push("");

  // ── Headline ──────────────────────────────────────────
  lines.push("📌 Headline");
  lines.push(`  ${"─".repeat(50)}`);
  lines.push(`  ${data.composition.headline}`);
  lines.push("");

  // ── Kompositionsmodi ────────────────────────────────────
  lines.push("📐 Kompositionsmodi");
  lines.push(`  ${"─".repeat(50)}`);
  const modeLabel: Record<string, string> = {
    static: "🔒 statisch (unverändert übernommen)",
    adapted: "✏️  adaptiert (an Ausschreibung angepasst)",
    generated: "🆕 neu generiert",
  };
  for (const section of data.composition.sections) {
    lines.push(`  ${section.name}: ${modeLabel[section.mode] ?? section.mode}`);
    if (section.sourceItem) {
      lines.push(`         Quellbasis: ${section.sourceItem}`);
    }
    if (section.evidenceRefs.length > 0) {
      lines.push(`         Evidenz-Referenzen: ${section.evidenceRefs.join(", ")}`);
    }
  }
  lines.push("");

  if (data.requirementsMap && data.requirementsMap.length > 0) {
    lines.push("🧩 Requirements-Map");
    lines.push(`  ${"─".repeat(50)}`);
    for (const entry of data.requirementsMap) {
      lines.push(`  [${entry.priority.toUpperCase()} · ${entry.coverage}] ${entry.requirement}`);
      lines.push(`     Evidenztyp: ${entry.evidenceType}`);
      if (entry.keyEvidence) {
        lines.push(`     Evidenz: ${entry.keyEvidence}`);
      }
    }
    lines.push("");
  }

  // ── Projekt-Ranking ─────────────────────────────────────
  if (data.projectRankings && data.projectRankings.length > 0) {
    lines.push(`🏆 Projekt-Ranking (${data.projectRankings.length} Projekte)`);
    lines.push(`  ${"─".repeat(50)}`);
    for (const r of data.projectRankings) {
      lines.push(`  #${r.rank} ${r.title} (${r.id})`);
      lines.push(`     ${r.rationale}`);
    }
    lines.push("");
  }

  if (data.gapAnalysis && data.gapAnalysis.findings.length > 0) {
    lines.push("🧭 Gap-Analyse");
    lines.push(`  ${"─".repeat(50)}`);
    lines.push(`  ${data.gapAnalysis.overallAssessment}`);
    for (const finding of data.gapAnalysis.findings) {
      const gapTag = finding.gapPriority ? ` · Lücke: ${finding.gapPriority.toUpperCase()}` : "";
      lines.push(`  [${finding.priority.toUpperCase()}${gapTag}] ${finding.requirement}`);
      lines.push(`     Status: ${finding.status}`);
      lines.push(`     ${finding.reasoning}`);
      if (finding.suggestedEvidence) lines.push(`     Hilfreiche Evidenz: ${finding.suggestedEvidence}`);
      lines.push(`     Zielort: ${finding.suggestedSourceLocation}`);
    }
    lines.push("");
  }

  // ── Diagnostics ─────────────────────────────────────────
  if (data.diagnostics.structuralWeaknesses.length > 0) {
    lines.push("⚠️  Diagnostics");
    lines.push(`  ${"─".repeat(50)}`);
    for (const w of data.diagnostics.structuralWeaknesses) {
      const icon = w.severity === "warning" ? "⚠️" : "ℹ️";
      lines.push(`  ${icon} [${w.type}] ${w.message}`);
    }
    lines.push("");
  }

  // ── Nachschärfungsvorschläge (FR37) ────────────────
  if (data.diagnostics.refinementSuggestions && data.diagnostics.refinementSuggestions.length > 0) {
    lines.push("🔧 Nachschärfungsbedarf");
    lines.push(`  ${"─".repeat(50)}`);
    for (const s of data.diagnostics.refinementSuggestions) {
      const icon = s.type === "add_source_data" ? "📝" : s.type === "expand_project" ? "📂" : "💡";
      lines.push(`  ${icon} [${s.requirementId}] ${s.message}`);
    }
    lines.push("");
  }

  if (data.diagnostics.ambiguities && data.diagnostics.ambiguities.length > 0) {
    lines.push("❓  Mehrdeutigkeiten");
    lines.push(`  ${"─".repeat(50)}`);
    for (const a of data.diagnostics.ambiguities) {
      lines.push(`  • ${a.issue} (${a.requirementId})`);
    }
    lines.push("");
  }

  // ── Lauf-Statistiken ────────────────────────────────────
  lines.push("⚡ Lauf-Statistiken");
  lines.push(`  ${"─".repeat(50)}`);
  lines.push(`  Dauer: ${(data.diagnostics.totalDurationMs / 1000).toFixed(1)}s`);
  lines.push(`  LLM-Calls: ${data.diagnostics.llmUsage.calls}`);
  lines.push(`  Tokens: ${data.diagnostics.llmUsage.totalTokens.toLocaleString()}`);
  lines.push(`  Sections: ${data.diagnostics.compositionSummary.totalSections} (${data.diagnostics.compositionSummary.staticCount} static, ${data.diagnostics.compositionSummary.adaptedCount} adapted, ${data.diagnostics.compositionSummary.generatedCount} generated)`);

  lines.push(`\n  Outputs:`);
  lines.push(`    📄 Draft:      ${data.diagnostics.outputRefs.draftPath}`);
  lines.push(`    📋 Intermediate: ${data.diagnostics.outputRefs.intermediatePath}`);
  lines.push(`    🔍 Diagnostics:  ${data.diagnostics.outputRefs.diagnosticsPath}`);
  if (data.diagnostics.outputRefs.gapAnalysisPath) {
    lines.push(`    🧭 Gap-Analyse: ${data.diagnostics.outputRefs.gapAnalysisPath}`);
  }

  return lines.join("\n");
}
