import type { ProfileCompositionDecision } from "../../model/composition/profile-composition-decision.js";
import type { RequirementsMapEntry } from "../../model/coverage/requirements-map.js";
import type { RunDiagnostic, StructuralWeakness, RefinementSuggestion } from "../../model/diagnostics/run-diagnostic.js";
import { summarizeRequirementsFit } from "../../shared/analysis/summarize-requirements-fit.js";
import { escapeHtml, renderAnalysisReportPage, renderMetaList, renderRequirementsSection, type ReportSection, type ReportSummaryCard } from "./analysis-report-shared.js";

export interface InspectData {
  runId: string;
  composition: ProfileCompositionDecision;
  diagnostics: RunDiagnostic;
  requirementsMap?: RequirementsMapEntry[];
  projectRankings?: Array<{
    rank: number;
    id: string;
    title: string;
    rationale: string;
  }>;
  inputs?: {
    postingPath?: string;
    sourcePaths?: string[];
    steeringHints?: string[];
    targetLanguage?: string;
  };
}

export function renderInspectHtml(data: InspectData): string {
  const requirements = data.requirementsMap ?? [];
  const fitSummary = summarizeRequirementsFit(requirements);
  const weaknessMap = buildWeaknessMap(data.diagnostics.structuralWeaknesses);
  const suggestionMap = buildSuggestionMap(data.diagnostics.refinementSuggestions ?? []);

  const summaryCards: ReportSummaryCard[] = [
    { label: "Anforderungen", value: String(fitSummary.total) },
    { label: "Gut belegt", value: String(fitSummary.byCoverage.gut_belegt), tone: "success" },
    { label: "Schwach gestützt", value: String(fitSummary.byCoverage.schwach_gestuetzt), tone: fitSummary.byCoverage.schwach_gestuetzt > 0 ? "warning" : "neutral" },
    { label: "Unbelegt", value: String(fitSummary.byCoverage.unbelegt), tone: fitSummary.byCoverage.unbelegt > 0 ? "danger" : "neutral" },
    { label: "LLM-Calls", value: String(data.diagnostics.llmUsage.calls) },
    { label: "Tokens", value: data.diagnostics.llmUsage.totalTokens.toLocaleString() },
  ];

  const sections: ReportSection[] = [
    {
      title: "Run-Metadaten",
      bodyHtml: renderMetaList([
        { label: "Run-ID", value: data.runId },
        { label: "Ausschreibung", value: data.inputs?.postingPath },
        { label: "Quellen", value: data.inputs?.sourcePaths },
        { label: "Steuerhinweise", value: data.inputs?.steeringHints },
        { label: "Profilsprache", value: data.inputs?.targetLanguage },
        { label: "Dauer", value: `${(data.diagnostics.totalDurationMs / 1000).toFixed(1)}s` },
      ]),
    },
    {
      title: "Projekt-Ranking",
      bodyHtml: renderProjectRankingSection(data.projectRankings ?? []),
    },
    {
      title: "Requirements-Fit",
      bodyHtml: renderRequirementsSection(requirements, (entry) => renderInspectExtras(entry, weaknessMap, suggestionMap)),
    },
    {
      title: "Kompositionsplan",
      bodyHtml: renderCompositionSection(data.composition),
    },
    {
      title: "Pipeline-Schritte",
      bodyHtml: renderStepTable(data.diagnostics),
    },
  ];

  return renderAnalysisReportPage({
    title: `Inspect ${data.runId}`,
    eyebrow: "Run-Analyse",
    summaryCards,
    sections,
  });
}

function renderProjectRankingSection(rankings: InspectData["projectRankings"]): string {
  if (!rankings || rankings.length === 0) {
    return '<p class="muted">Kein Projekt-Ranking vorhanden.</p>';
  }

  return `<ol class="item-list">${rankings.map((ranking) => `
    <li>
      <strong>#${ranking.rank} ${escapeHtml(ranking.title)}</strong>
      <div class="muted">${escapeHtml(ranking.id)}</div>
      <div>${escapeHtml(ranking.rationale)}</div>
    </li>
  `).join("")}</ol>`;
}

function renderCompositionSection(composition: ProfileCompositionDecision): string {
  return `<ul class="item-list">${composition.sections.map((section) => `
    <li>
      <strong>${escapeHtml(section.name)}</strong> – ${escapeHtml(section.mode)}
      ${section.sourceItem ? `<div class="muted">Quellbasis: ${escapeHtml(section.sourceItem)}</div>` : ""}
      ${section.evidenceRefs.length > 0 ? `<div class="muted">Evidenz: ${escapeHtml(section.evidenceRefs.join(", "))}</div>` : ""}
    </li>
  `).join("")}</ul>`;
}

function renderStepTable(diagnostics: RunDiagnostic): string {
  if (diagnostics.steps.length === 0) {
    return '<p class="muted">Keine Step-Timings vorhanden.</p>';
  }

  return `<table class="table">
    <thead>
      <tr><th>Schritt</th><th>Status</th><th>Dauer</th></tr>
    </thead>
    <tbody>
      ${diagnostics.steps.map((step) => `<tr>
        <td>${escapeHtml(step.name)}</td>
        <td>${escapeHtml(step.status)}</td>
        <td>${escapeHtml(`${step.durationMs} ms`)}</td>
      </tr>`).join("")}
    </tbody>
  </table>`;
}

function renderInspectExtras(
  entry: RequirementsMapEntry,
  weaknessMap: Map<string, StructuralWeakness>,
  suggestionMap: Map<string, RefinementSuggestion>,
): string {
  const blocks: string[] = [];
  const weakness = weaknessMap.get(entry.requirement);
  const suggestion = suggestionMap.get(entry.requirement);

  if (weakness) {
    blocks.push(`<div class="callout ${weakness.severity === "warning" ? "warning" : "info"}">
      <div class="kv-label">Diagnostics</div>
      <div>${escapeHtml(weakness.message)}</div>
    </div>`);
  }

  if (suggestion) {
    blocks.push(`<div class="callout warning">
      <div class="kv-label">Refinement Suggestion</div>
      <div>${escapeHtml(suggestion.message)}</div>
    </div>`);
  }

  return blocks.join("");
}

function buildWeaknessMap(weaknesses: StructuralWeakness[]): Map<string, StructuralWeakness> {
  const map = new Map<string, StructuralWeakness>();
  for (const weakness of weaknesses) {
    if (weakness.requirement) {
      map.set(weakness.requirement, weakness);
    }
  }
  return map;
}

function buildSuggestionMap(suggestions: RefinementSuggestion[]): Map<string, RefinementSuggestion> {
  return new Map(suggestions.map((suggestion) => [suggestion.requirementId, suggestion]));
}

export function inspectHtmlPath(runId: string): string {
  return `./runs/${runId}/inspect.html`;
}
