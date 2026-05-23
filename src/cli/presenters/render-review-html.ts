import type { RequirementsMapEntry } from "../../model/coverage/requirements-map.js";
import type { RequirementsFitSummary } from "../../shared/analysis/summarize-requirements-fit.js";
import { renderAnalysisReportPage, renderMetaList, renderRequirementsSection, type ReportSection, type ReportSummaryCard } from "./analysis-report-shared.js";

export interface ReviewHtmlData {
  runId: string;
  postingPath: string;
  sourcePaths: string[];
  steeringHints: string[];
  requirementsMap: RequirementsMapEntry[];
  fitSummary: RequirementsFitSummary;
  llmTokens: number;
}

export function reviewHtmlPath(runId: string): string {
  return `./runs/${runId}/review.html`;
}

export function renderReviewHtml(data: ReviewHtmlData): string {
  const summaryCards: ReportSummaryCard[] = [
    { label: "Gesamtbewertung", value: data.fitSummary.overallAssessment, tone: data.fitSummary.criticalGaps > 0 ? "danger" : data.fitSummary.byCoverage.unbelegt > 0 ? "warning" : "success" },
    { label: "Anforderungen", value: String(data.fitSummary.total) },
    { label: "Gut belegt", value: String(data.fitSummary.byCoverage.gut_belegt), tone: "success" },
    { label: "Schwach gestützt", value: String(data.fitSummary.byCoverage.schwach_gestuetzt), tone: data.fitSummary.byCoverage.schwach_gestuetzt > 0 ? "warning" : "neutral" },
    { label: "Unbelegt", value: String(data.fitSummary.byCoverage.unbelegt), tone: data.fitSummary.byCoverage.unbelegt > 0 ? "danger" : "neutral" },
    { label: "Kritische Lücken", value: String(data.fitSummary.criticalGaps), tone: data.fitSummary.criticalGaps > 0 ? "danger" : "success" },
  ];

  const sections: ReportSection[] = [
    {
      title: "Eingaben",
      bodyHtml: renderMetaList([
        { label: "Run-ID", value: data.runId },
        { label: "Ausschreibung", value: data.postingPath },
        { label: "Quellen", value: data.sourcePaths },
        { label: "Steuerhinweise", value: data.steeringHints },
        { label: "LLM-Tokens", value: data.llmTokens.toLocaleString() },
      ]),
    },
    {
      title: "Requirements-Fit",
      bodyHtml: renderRequirementsSection(data.requirementsMap),
    },
  ];

  return renderAnalysisReportPage({
    title: `Review ${data.runId}`,
    eyebrow: "Preflight-Analyse",
    summaryCards,
    sections,
  });
}
