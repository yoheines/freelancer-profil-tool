# Freelancer Profil Tool

CLI-Tool zur Generierung massgeschneiderter Freelancer-Profile aus Job-Ausschreibungen.

## Funktionsweise

Das Tool erzeugt aus einer Ausschreibung, deinem Profil und deiner Projekthistorie einen ausschreibungsspezifischen Markdown-Profilentwurf – mit 5 LLM-Calls in einer schlanken Pipeline.

📖 **Ausführliche Schritt-für-Schritt-Anleitung:** [`docs/user-guide.md`](docs/user-guide.md)
(Von der Installation über die PDF-Konvertierung bis zum fertigen Profilentwurf – mit Konvertierungs-Prompt, Gap Analysis und Workflow-Diagramm.)

```
Ausschreibung + Profil + Projekte
         │
         ▼
┌─────────────────────────────────┐
│  5-stufige LLM-Pipeline         │
│  • Requirements bewerten        │
│  • Keywords kuratieren          │
│  • Top-Projekte ranken          │
│  • Einleitung generieren        │
│  • Projekte adaptieren          │
└─────────────────────────────────┘
         │
         ▼
  profile-draft.md  +  intermediate.yaml  +  diagnostics.yaml
```

## Installation

```bash
git clone <repo>
cd freelancer-profil-tool
npm install
```

Dann API-Key in `secrets/secrets.local.yaml` setzen:

```yaml
apiKey: "dein-openai-kompatibler-key"
```

## Verwendung

### Mit eigenen Daten

```bash
npx tsx src/cli/cli.ts run \
  -p sources/ausschreibungen/meine-ausschreibung.txt \
  -s sources/profil.yaml \
  -s sources/projekte.yaml \
  --top-projects 5 \
  --language de
```

### Mit Beispiel-Daten

```bash
npx tsx src/cli/cli.ts run \
  -p tests/fixtures/job-postings/product-owner-insurance.txt \
  -s tests/fixtures/profile-sources/example-profil.yaml \
  -s tests/fixtures/project-histories/example-projekte.yaml \
  --top-projects 5 \
  --language de
```

### Vorab-Review (Gap Analysis)

```bash
npx tsx src/cli/cli.ts review \
  -p tests/fixtures/job-postings/product-owner-insurance.txt \
  -s tests/fixtures/profile-sources/example-profil.yaml \
  -s tests/fixtures/project-histories/example-projekte.yaml
# Prüft Quellen gegen Ausschreibung und erzeugt gap-analysis.yaml
```

### Ergebnisse inspizieren

```bash
npx tsx src/cli/cli.ts inspect <run-id>
# Zeigt Kompositionsmodi, Diagnostics und Nachschärfungsbedarf
```

### Ergebnisse

Nach jedem Lauf liegen im Ordner `runs/<run-id>/`:

| Datei | Beschreibung |
|---|---|
| `profile-draft.md` | Generierter Profilentwurf |
| `intermediate.yaml` | Strukturiertes Zwischenmodell |
| `diagnostics.yaml` | Metriken, Schwächen, Nachschärfungsvorschläge |
| `llm-traces.yaml` | Vollständige Prompt/Response-Traces (bei jedem LLM-Call mitgeschrieben) |
| `gap-analysis.yaml` | Gap-Analyse des Vorab-Reviews (nur nach `review`-Befehl) |

## Tests

```bash
npm test        # 53 Unit-Tests
npx tsc --noEmit  # TypeScript-Prüfung
```

## Konfiguration

- **`config/default.yaml`** – LLM-Modell, Provider, Workspace-Pfade, Projektanzahl (`projectSelection.targetCount`) und Keywordanzahl (`keywordSelection.targetCount`)
- **`secrets/secrets.local.yaml`** – API-Key (nicht versioniert)

## Prompts anpassen

Alle LLM-Prompts liegen als bearbeitbare YAML-Dateien in `prompts/`:

```
prompts/
├── 01-requirements-map-prompt.yaml   # Requirements-Map
├── 02-keywords-prompt.yaml           # Keyword-Kuration
├── 03-rank-projects-prompt.yaml      # Projekt-Ranking
├── 04-profile-hook-prompt.yaml       # Einleitung
├── 05-project-adaptation-prompt.yaml # Projekt-Adaption
├── 06-gap-analysis-prompt.yaml       # Vorab-Review (Gap-Analyse)
└── _shared/
    ├── evidenz-strategie.yaml        # priority × coverage-Matrix
    └── analyse-grundsaetze.yaml      # Granularität, implizite Anforderungen
```

Jede Datei enthält `system_prompt` und `user_prompt` mit `{{PLATZHALTER}}` für dynamische Inhalte. Du kannst die Texte, Stilvorgaben und Regeln anpassen, ohne den Code zu ändern.

Die zentrale Evidenz- und Analyselogik ist in `prompts/_shared/` definiert und wird von mehreren Prompts referenziert (`{{EVIDENZ_STRATEGIE}}`, `{{ANALYSE_GRUNDSAETZE}}`).

## Architektur

Detaildiagramme und Komponentenbeschreibung in [`docs/architecture.md`](docs/architecture.md).

Fuer eine eigenstaendige **Anwenderdokumentation** mit praeziser Schritt-fuer-Schritt-Erklaerung der Pipeline siehe [`docs/how-it-works.md`](docs/how-it-works.md).
