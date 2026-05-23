import type { RequirementsMapEntry } from "../../model/coverage/requirements-map.js";

export interface ReportSummaryCard {
  label: string;
  value: string;
  tone?: "neutral" | "success" | "warning" | "danger";
}

export interface ReportSection {
  title: string;
  bodyHtml: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderAnalysisReportPage(options: {
  title: string;
  eyebrow: string;
  summaryCards: ReportSummaryCard[];
  sections: ReportSection[];
}): string {
  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(options.title)}</title>
<style>
  :root {
    --bg: #f8fafc;
    --surface: #ffffff;
    --surface-alt: #f1f5f9;
    --border: #dbe3ee;
    --text: #0f172a;
    --muted: #475569;
    --primary: #1d4ed8;
    --success: #15803d;
    --warning: #b45309;
    --danger: #b91c1c;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
  }
  .page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 24px 48px;
  }
  .hero {
    background: linear-gradient(135deg, #eff6ff 0%, #ffffff 55%, #f8fafc 100%);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 24px;
    margin-bottom: 24px;
  }
  .eyebrow {
    color: var(--primary);
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }
  h1 {
    margin: 0;
    font-size: 30px;
    line-height: 1.15;
  }
  .summary-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 14px;
    margin-top: 22px;
  }
  .summary-card {
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--surface);
    padding: 16px;
  }
  .summary-card.success { border-color: #bbf7d0; background: #f0fdf4; }
  .summary-card.warning { border-color: #fed7aa; background: #fff7ed; }
  .summary-card.danger { border-color: #fecaca; background: #fef2f2; }
  .summary-label {
    color: var(--muted);
    font-size: 13px;
    margin-bottom: 8px;
  }
  .summary-value {
    font-size: 24px;
    font-weight: 700;
  }
  .section {
    margin-top: 24px;
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 20px;
    padding: 22px;
  }
  .section h2 {
    margin: 0 0 16px;
    font-size: 20px;
  }
  .meta-list, .item-list {
    margin: 0;
    padding-left: 18px;
  }
  .meta-list li, .item-list li { margin: 8px 0; }
  .requirements-grid {
    display: grid;
    gap: 14px;
  }
  .requirement-card {
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 16px;
    background: linear-gradient(180deg, #ffffff 0%, #fbfdff 100%);
  }
  .requirement-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 16px;
    margin-bottom: 12px;
  }
  .requirement-title {
    margin: 0;
    font-size: 17px;
  }
  .badge-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    border-radius: 999px;
    padding: 4px 10px;
    font-size: 12px;
    font-weight: 700;
    border: 1px solid transparent;
    white-space: nowrap;
  }
  .badge.priority-hoch { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
  .badge.priority-mittel { background: #ffedd5; color: #9a3412; border-color: #fdba74; }
  .badge.priority-niedrig { background: #e2e8f0; color: #334155; border-color: #cbd5e1; }
  .badge.coverage-gut_belegt { background: #dcfce7; color: #166534; border-color: #bbf7d0; }
  .badge.coverage-schwach_gestuetzt { background: #fef3c7; color: #92400e; border-color: #fde68a; }
  .badge.coverage-unbelegt { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
  .badge.evidence { background: #eff6ff; color: #1d4ed8; border-color: #bfdbfe; }
  .badge.gap-hoch { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
  .badge.gap-mittel { background: #ffedd5; color: #9a3412; border-color: #fdba74; }
  .badge.gap-niedrig { background: #f1f5f9; color: #475569; border-color: #cbd5e1; }
  .requirement-body {
    display: grid;
    gap: 10px;
  }
  .kv {
    display: grid;
    gap: 4px;
  }
  .kv-label {
    color: var(--muted);
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    font-weight: 700;
  }
  .callout {
    border-radius: 14px;
    padding: 12px 14px;
    background: var(--surface-alt);
    border: 1px solid var(--border);
  }
  .callout.warning { background: #fff7ed; border-color: #fdba74; }
  .callout.info { background: #eff6ff; border-color: #bfdbfe; }
  .table {
    width: 100%;
    border-collapse: collapse;
  }
  .table th, .table td {
    text-align: left;
    padding: 10px 12px;
    border-bottom: 1px solid var(--border);
    vertical-align: top;
  }
  .muted { color: var(--muted); }
  @media (max-width: 800px) {
    .page { padding: 20px 14px 32px; }
    .requirement-header { flex-direction: column; }
  }
</style>
</head>
<body>
  <main class="page">
    <section class="hero">
      <div class="eyebrow">${escapeHtml(options.eyebrow)}</div>
      <h1>${escapeHtml(options.title)}</h1>
      <div class="summary-grid">
        ${options.summaryCards.map(renderSummaryCard).join("")}
      </div>
    </section>
    ${options.sections.map((section) => `
      <section class="section">
        <h2>${escapeHtml(section.title)}</h2>
        ${section.bodyHtml}
      </section>
    `).join("")}
  </main>
</body>
</html>`;
}

function renderSummaryCard(card: ReportSummaryCard): string {
  return `<article class="summary-card ${card.tone ?? "neutral"}">
    <div class="summary-label">${escapeHtml(card.label)}</div>
    <div class="summary-value">${escapeHtml(card.value)}</div>
  </article>`;
}

export function sortRequirements(entries: RequirementsMapEntry[]): RequirementsMapEntry[] {
  const priorityOrder: Record<string, number> = { hoch: 0, mittel: 1, niedrig: 2 };
  const coverageOrder: Record<string, number> = { unbelegt: 0, schwach_gestuetzt: 1, gut_belegt: 2 };

  return [...entries].sort((left, right) => {
    const priorityDiff = (priorityOrder[left.priority] ?? 99) - (priorityOrder[right.priority] ?? 99);
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return (coverageOrder[left.coverage] ?? 99) - (coverageOrder[right.coverage] ?? 99);
  });
}

export function renderMetaList(items: Array<{ label: string; value: string | string[] | undefined }>): string {
  const visible = items.filter((item) => item.value && (Array.isArray(item.value) ? item.value.length > 0 : item.value.trim().length > 0));
  if (visible.length === 0) {
    return '<p class="muted">Keine zusätzlichen Metadaten vorhanden.</p>';
  }

  return `<ul class="meta-list">${visible.map((item) => {
    const rawValue = Array.isArray(item.value) ? item.value.join(", ") : item.value ?? "";
    return `<li><strong>${escapeHtml(item.label)}:</strong> ${escapeHtml(rawValue)}</li>`;
  }).join("")}</ul>`;
}

export function renderRequirementsSection(
  entries: RequirementsMapEntry[],
  renderExtra?: (entry: RequirementsMapEntry) => string,
): string {
  if (entries.length === 0) {
    return '<p class="muted">Keine Anforderungen verfügbar.</p>';
  }

  return `<div class="requirements-grid">${sortRequirements(entries).map((entry) => renderRequirementCard(entry, renderExtra?.(entry) ?? "")).join("")}</div>`;
}

function renderRequirementCard(entry: RequirementsMapEntry, extraHtml: string): string {
  const badges = [
    `<span class="badge priority-${entry.priority}">Priorität: ${escapeHtml(entry.priority)}</span>`,
    `<span class="badge coverage-${entry.coverage}">Coverage: ${escapeHtml(entry.coverage)}</span>`,
    `<span class="badge evidence">Evidenz: ${escapeHtml(entry.evidenceType)}</span>`,
  ];

  if (entry.gapPriority) {
    badges.push(`<span class="badge gap-${entry.gapPriority}">Lücke: ${escapeHtml(entry.gapPriority)}</span>`);
  }

  return `<article class="requirement-card">
    <div class="requirement-header">
      <h3 class="requirement-title">${escapeHtml(entry.requirement)}</h3>
      <div class="badge-row">${badges.join("")}</div>
    </div>
    <div class="requirement-body">
      ${entry.keyEvidence ? `<div class="kv"><div class="kv-label">Stärkste Evidenz</div><div>${escapeHtml(entry.keyEvidence)}</div></div>` : ""}
      ${entry.reasoning ? `<div class="callout info"><div class="kv-label">Begründung</div><div>${escapeHtml(entry.reasoning)}</div></div>` : ""}
      ${(entry.coverage !== "gut_belegt" && (entry.suggestedEvidence || entry.suggestedSourceLocation)) ? `
        <div class="callout warning">
          <div class="kv-label">Nachschärfung</div>
          ${entry.suggestedEvidence ? `<div>${escapeHtml(entry.suggestedEvidence)}</div>` : ""}
          ${entry.suggestedSourceLocation ? `<div class="muted">Zielort: ${escapeHtml(entry.suggestedSourceLocation)}</div>` : ""}
        </div>
      ` : ""}
      ${extraHtml}
    </div>
  </article>`;
}
