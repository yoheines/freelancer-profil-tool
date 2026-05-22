/**
 * Generiert eine selbstständige HTML-Seite zur Inspektion eines Runs.
 * Alle Diagnostics und Suggestions sind inline bei den Requirements.
 * Keine externen Abhängigkeiten, A4-gerecht, druckoptimiert.
 */

import type { ProfileCompositionDecision } from "../../model/composition/profile-composition-decision.js";
import type { RequirementsMapEntry } from "../../model/coverage/requirements-map.js";
import type { RunDiagnostic, StructuralWeakness, RefinementSuggestion } from "../../model/diagnostics/run-diagnostic.js";

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
}

// ── Hilfsfunktionen ─────────────────────────────────────

function sortRequirements(entries: RequirementsMapEntry[]): RequirementsMapEntry[] {
  const priorityOrder: Record<string, number> = { hoch: 0, mittel: 1, niedrig: 2 };
  const coverageOrder: Record<string, number> = { unbelegt: 0, schwach_gestuetzt: 1, gut_belegt: 2 };

  return [...entries].sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 99;
    const pb = priorityOrder[b.priority] ?? 99;
    if (pa !== pb) return pa - pb;
    return (coverageOrder[a.coverage] ?? 99) - (coverageOrder[b.coverage] ?? 99);
  });
}

function buildWeaknessMap(weaknesses: StructuralWeakness[]): Map<string, StructuralWeakness> {
  const map = new Map<string, StructuralWeakness>();
  for (const w of weaknesses) {
    const key = w.requirement ?? w.requirementId ?? "";
    if (key) map.set(key, w);
  }
  return map;
}

function buildSuggestionMap(suggestions: RefinementSuggestion[]): Map<string, RefinementSuggestion> {
  const map = new Map<string, RefinementSuggestion>();
  for (const s of suggestions) {
    map.set(s.requirementId, s);
  }
  return map;
}

function cssVar(value: string): string {
  return `var(${value})`;
}

// ── Badge-Hilfen ────────────────────────────────────────

const priorityConfig: Record<string, { label: string; color: string; bg: string }> = {
  hoch:  { label: "Hoch",   color: "#ffffff", bg: "#b91c1c" },
  mittel:{ label: "Mittel", color: "#000000", bg: "#f59e0b" },
  niedrig:{label: "Niedrig",color: "#ffffff", bg: "#64748b" },
};

const coverageConfig: Record<string, { label: string; color: string; bg: string }> = {
  gut_belegt:      { label: "Gut belegt",       color: "#ffffff", bg: "#15803d" },
  schwach_gestuetzt:{ label: "Schwach gestützt",color: "#000000", bg: "#facc15" },
  unbelegt:        { label: "Unbelegt",          color: "#ffffff", bg: "#dc2626" },
};

const evidenceIcon: Record<string, string> = {
  projekt:     "📂",
  profil_skill:"⭐",
  zertifikat:  "🎓",
  rolle:       "💼",
  indirekt:    "🔗",
  keine:       "❌",
};

const sectionBadge: Record<string, string> = {
  static:   "<span class='badge badge-static'>🔒 Statisch</span>",
  adapted:  "<span class='badge badge-adapted'>✏️ Adaptiert</span>",
  generated:"<span class='badge badge-generated'>🆕 Generiert</span>",
};

// ── Hauptfunktion ───────────────────────────────────────

export function renderInspectHtml(data: InspectData): string {
  const weaknessMap = buildWeaknessMap(data.diagnostics.structuralWeaknesses);
  const suggestionMap = buildSuggestionMap(data.diagnostics.refinementSuggestions ?? []);

  const sorted = data.requirementsMap ? sortRequirements(data.requirementsMap) : [];

  // Evidence-Typen zählen für die Zwischenbilanz
  const evidenceCounts: Record<string, number> = {};
  for (const e of sorted) {
    evidenceCounts[e.evidenceType] = (evidenceCounts[e.evidenceType] ?? 0) + 1;
  }
  const evidenceTypes = Object.keys(evidenceCounts).sort();

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Inspect ${escapeHtml(data.runId)}</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  :root {
    --surface: #ffffff;
    --bg: #f1f5f9;
    --text: #0f172a;
    --text-muted: #64748b;
    --border: #e2e8f0;
    --card-bg: #ffffff;
    --accent: #2563eb;
  }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Helvetica Neue", Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
    padding: 24px;
  }
  .container {
    max-width: 1000px;
    margin: 0 auto;
  }

  /* Header */
  header {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 24px 28px;
    margin-bottom: 20px;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px 20px;
  }
  header h1 {
    font-size: 20px;
    font-weight: 700;
    flex: 1 1 100%;
  }
  header h1 code {
    background: #eef2ff;
    color: #4338ca;
    padding: 2px 10px;
    border-radius: 6px;
    font-size: 18px;
  }
  .headline {
    font-size: 16px;
    color: var(--text-muted);
    flex: 1 1 100%;
    padding: 8px 12px;
    background: #f8fafc;
    border-radius: 8px;
    border-left: 4px solid var(--accent);
  }
  .stats {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    font-size: 14px;
    color: var(--text-muted);
  }
  .stats span {
    white-space: nowrap;
  }

  /* Sections */
  section {
    background: var(--card-bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 20px 24px;
    margin-bottom: 16px;
  }
  section h2 {
    font-size: 17px;
    font-weight: 600;
    margin-bottom: 14px;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  /* Composition Grid */
  .section-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 10px;
  }
  .section-card {
    padding: 12px 14px;
    background: #f8fafc;
    border-radius: 8px;
    border: 1px solid var(--border);
  }
  .section-card .name {
    font-weight: 600;
    font-size: 14px;
    margin-bottom: 6px;
  }
  .badge {
    display: inline-block;
    font-size: 11px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 4px;
    white-space: nowrap;
  }
  .badge-static    { background: #f1f5f9; color: #475569; }
  .badge-adapted   { background: #fef3c7; color: #92400e; }
  .badge-generated { background: #dbeafe; color: #1e40af; }

  /* Requirement Card */
  .req-list { display: flex; flex-direction: column; gap: 10px; }
  .req-card {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px 16px;
    transition: box-shadow .15s;
  }
  .req-card:hover { box-shadow: 0 1px 6px rgba(0,0,0,.08); }
  .req-card.coverage-unbelegt        { border-left: 4px solid #dc2626; }
  .req-card.coverage-schwach_gestuetzt{ border-left: 4px solid #eab308; }
  .req-card.coverage-gut_belegt      { border-left: 4px solid #22c55e; }

  .req-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }
  .req-name {
    font-weight: 600;
    font-size: 15px;
    flex: 1 1 200px;
  }
  .req-meta {
    font-size: 13px;
    color: var(--text-muted);
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px 12px;
    margin-top: 4px;
  }
  .req-evidence {
    margin-top: 6px;
    padding: 6px 10px;
    background: #f8fafc;
    border-radius: 6px;
    font-size: 13px;
    color: #334155;
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .req-evidence .icon { font-size: 16px; flex-shrink: 0; margin-top: 1px; }
  .req-evidence .text { word-break: break-word; }

  /* Inline diagnostic */
  .req-diagnostic {
    margin-top: 8px;
    padding: 8px 10px;
    border-radius: 6px;
    font-size: 13px;
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .req-diagnostic.warning { background: #fef2f2; border-left: 3px solid #dc2626; color: #991b1b; }
  .req-diagnostic.info    { background: #fffbeb; border-left: 3px solid #f59e0b; color: #92400e; }
  .req-diagnostic .icon   { flex-shrink: 0; font-size: 14px; margin-top: 1px; }

  /* Inline suggestion */
  .req-suggestion {
    margin-top: 6px;
    padding: 8px 10px;
    background: #f0f9ff;
    border-radius: 6px;
    font-size: 13px;
    color: #1e40af;
    border-left: 3px solid #3b82f6;
    display: flex;
    align-items: flex-start;
    gap: 8px;
  }
  .req-suggestion .icon { flex-shrink: 0; font-size: 14px; margin-top: 1px; }

  /* Badge helpers */
  .badge-priority, .badge-coverage {
    display: inline-block;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 4px;
    white-space: nowrap;
    letter-spacing: .3px;
  }

  /* Project Cards */
  .proj-list { display: flex; flex-direction: column; gap: 12px; }
  .proj-card {
    border: 1px solid var(--border);
    border-radius: 8px;
    padding: 14px 16px;
  }
  .proj-rank {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--accent);
    color: #fff;
    font-size: 14px;
    font-weight: 700;
    margin-right: 10px;
    flex-shrink: 0;
  }
  .proj-title {
    font-weight: 600;
    font-size: 15px;
    display: flex;
    align-items: center;
  }
  .proj-id {
    font-size: 12px;
    color: var(--text-muted);
    margin-left: 8px;
  }
  .proj-rationale {
    margin-top: 6px;
    font-size: 13px;
    color: #334155;
    padding: 6px 10px;
    background: #f8fafc;
    border-radius: 6px;
  }

  /* Evidence summary */
  .ev-summary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }
  .ev-summary-item {
    font-size: 12px;
    padding: 4px 10px;
    background: #f1f5f9;
    border-radius: 6px;
    color: #475569;
  }

  /* Stats in footer */
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 10px;
  }
  .stat-item {
    padding: 10px;
    background: #f8fafc;
    border-radius: 8px;
    text-align: center;
  }
  .stat-item .value {
    font-size: 20px;
    font-weight: 700;
    color: var(--accent);
  }
  .stat-item .label {
    font-size: 12px;
    color: var(--text-muted);
    margin-top: 2px;
  }

  /* Print */
  @media print {
    body { background: #fff; padding: 0; }
    .container { max-width: none; }
    header, section { break-inside: avoid; border-color: #ccc; }
    .req-card:hover { box-shadow: none; }
  }
</style>
</head>
<body>
<div class="container">

  <!-- ── HEADER ──────────────────────────────────── -->
  <header>
    <h1>🔍 Inspect Run: <code>${escapeHtml(data.runId)}</code></h1>
    ${data.composition.headline ? `<div class="headline">${escapeHtml(data.composition.headline)}</div>` : ""}
    <div class="stats">
      <span>⚡ ${(data.diagnostics.totalDurationMs / 1000).toFixed(1)}s</span>
      <span>📞 ${data.diagnostics.llmUsage.calls} LLM-Calls</span>
      <span>🔤 ${data.diagnostics.llmUsage.totalTokens.toLocaleString()} Tokens</span>
      <span>📄 <a href="profile-draft.yaml">profile-draft.yaml</a></span>
    </div>
  </header>

  <!-- ── PROJEKT-RANKING ─────────────────────────── -->
  ${data.projectRankings && data.projectRankings.length > 0 ? `<section>
    <h2>🏆 Projekt-Ranking <span style="font-weight:400;font-size:14px;color:var(--text-muted);">(${data.projectRankings.length} Projekte)</span></h2>
    <div class="proj-list">
      ${data.projectRankings.map(r => `<div class="proj-card">
        <div class="proj-title">
          <span class="proj-rank">${r.rank}</span>
          ${escapeHtml(r.title)}
          <span class="proj-id">${escapeHtml(r.id)}</span>
        </div>
        <div class="proj-rationale">${escapeHtml(r.rationale)}</div>
      </div>`).join("\n      ")}
    </div>
  </section>` : ""}

  <!-- ── EVIDENZ-ZWISCHENBILANZ ──────────────────── -->
  <section>
    <h2>🧩 Anforderungsabdeckung <span style="font-weight:400;font-size:14px;color:var(--text-muted);">(${sorted.length} Anforderungen)</span></h2>

    <div class="ev-summary">
      ${evidenceTypes.map(t => {
        const icon = evidenceIcon[t] ?? "📋";
        return `<span class="ev-summary-item">${icon} ${t === "profil_skill" ? "Profil-Skills" : t === "projekt" ? "Projekte" : t === "zertifikat" ? "Zertifikate" : t === "rolle" ? "Rollen" : t === "indirekt" ? "Indirekt" : "Keine"} (${evidenceCounts[t]})</span>`;
      }).join("\n      ")}
    </div>

    <div class="req-list">
      ${sorted.map(entry => {
        const pc = priorityConfig[entry.priority] ?? priorityConfig.niedrig;
        const cc = coverageConfig[entry.coverage] ?? coverageConfig.unbelegt;
        const evIcon = evidenceIcon[entry.evidenceType] ?? "📋";

        const weakness = weaknessMap.get(entry.requirement);
        const suggestion = suggestionMap.get(entry.requirement);

        return `<div class="req-card coverage-${entry.coverage}">
          <div class="req-header">
            <span class="req-name">${escapeHtml(entry.requirement)}</span>
            <span class="badge-priority" style="background:${pc.bg};color:${pc.color};">${pc.label}</span>
            <span class="badge-coverage" style="background:${cc.bg};color:${cc.color};">${cc.label}</span>
          </div>
          <div class="req-meta">
            <span>Typ: ${entry.evidenceType}</span>
          </div>
          ${entry.keyEvidence ? `<div class="req-evidence">
            <span class="icon">${evIcon}</span>
            <span class="text">${escapeHtml(entry.keyEvidence)}</span>
          </div>` : ""}
          ${weakness ? `<div class="req-diagnostic ${weakness.severity}">
            <span class="icon">${weakness.severity === "warning" ? "⚠️" : "ℹ️"}</span>
            <span>${escapeHtml(weakness.message)}</span>
          </div>` : ""}
          ${suggestion ? `<div class="req-suggestion">
            <span class="icon">💡</span>
            <span>${escapeHtml(suggestion.message)}</span>
          </div>` : ""}
        </div>`;
      }).join("\n      ")}
    </div>
  </section>

  <!-- ── STATISTIK ───────────────────────────────── -->
  <section>
    <h2>⚡ Lauf-Statistiken</h2>
    <div class="stats-grid">
      <div class="stat-item">
        <div class="value">${(data.diagnostics.totalDurationMs / 1000).toFixed(1)}s</div>
        <div class="label">Dauer</div>
      </div>
      <div class="stat-item">
        <div class="value">${data.diagnostics.llmUsage.calls}</div>
        <div class="label">LLM-Calls</div>
      </div>
      <div class="stat-item">
        <div class="value">${data.diagnostics.llmUsage.totalTokens.toLocaleString()}</div>
        <div class="label">Tokens</div>
      </div>
      <div class="stat-item">
        <div class="value" style="font-size:14px;">${data.runId}</div>
        <div class="label">Run-ID</div>
      </div>
    </div>

    <div style="margin-top:14px;font-size:13px;color:var(--text-muted);">
      📄 <a href="profile-draft.yaml">profile-draft.yaml</a>
      ${data.diagnostics.outputRefs.metaPath ? `&nbsp;·&nbsp; 📋 <a href="run-meta.yaml">run-meta.yaml</a>` : ""}
    </div>
  </section>

</div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Bestimmt den Dateinamen für das Inspect-HTML im Run-Verzeichnis.
 */
export function inspectHtmlPath(runId: string): string {
  return `./runs/${runId}/inspect.html`;
}
