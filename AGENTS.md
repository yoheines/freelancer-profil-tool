# AGENTS.md — Freelancer Profil Tool

## Kurzbeschreibung

CLI-Tool zur Generierung massgeschneiderter Freelancer-Profile aus Job-Ausschreibungen. Eine schlanke Pipeline mit 5 LLM-Calls nutzt die rohe Ausschreibung direkt, bewertet zuerst die Anforderungsabdeckung, kuratiert darauf aufbauend Keywords, rankt die relevantesten Projekte rein LLM-basiert, adaptiert sie im Batch und komponiert einen vollständigen Markdown-Profilentwurf.

## Schnellstart

```bash
# Lauf starten
npx tsx src/cli/cli.ts run \
  -p pfad/zur/ausschreibung.txt \
  -s pfad/zum/profil.yaml \
  -s pfad/zu/projekte.yaml

# Vorab-Review der Quellen gegen die Ausschreibung
npx tsx src/cli/cli.ts review \
  -p pfad/zur/ausschreibung.txt \
  -s pfad/zum/profil.yaml \
  -s pfad/zu/projekte.yaml

# Ergebnisse inspizieren
npx tsx src/cli/cli.ts inspect <run-id>

# Tests ausführen
npm test

# TypeScript-Prüfung
npx tsc --noEmit
```

## Projekt-Sprache

Deutsch. Sämtliche Prompts, Outputs, Code-Kommentare und Dokumentation auf Deutsch. Normale deutsche Umlaute und `ß` verwenden, also `ä`, `ö`, `ü`, `Ä`, `Ö`, `Ü`, `ß` statt ASCII-Umschreibungen wie `ae`, `oe`, `ue`, `ss`, ausser wenn ein technischer Kontext zwingend ASCII verlangt. Keine englischen Variablen- oder Dateinamen in User-facing-Kontexten.

## Pipeline-Architektur

5 LLM-Calls, orchestriert in `src/core/pipeline/run-profile-pipeline.ts`:

| # | Schritt | Typ | Prompt |
|---|---|---|---|
| 1 | analyze-requirements-coverage | LLM | `01-requirements-map-prompt.yaml` |
| 2 | curate-skill-keywords | LLM | `02-keywords-prompt.yaml` |
| 3 | plan-composition | rule-based | – |
| 4 | rank-projects | LLM | `03-rank-projects-prompt.yaml` |
| 5 | generate-profile-hook | LLM | `04-profile-hook-prompt.yaml` |
| 6 | adapt-project-descriptions | LLM | `05-project-adaptation-prompt.yaml` |
| 7 | compose-yaml | rule-based | – |
| 8 | evaluate-diagnostics | rule-based | – |
| 9 | persist-artifacts | rule-based | – |

Detaildiagramme: `docs/architecture.md`

## Skill-Rating (Vertrautheit)

Skills im Quell-Profil können ein optionales `rating`-Feld (`high`, `medium`, `low`) erhalten,
das die Vertrautheit/Erfahrungstiefe des Freelancers in diesem Skill angibt.

**Wirkung:**
- **Coverage-Analyse (Schritt 1):** Der LLM erhält das Rating als weichen Kontext in
  `{{SOURCE_DATA_JSON}}`. Ein `rating: "high"` kann die Coverage-Bewertung positiv beeinflussen,
  ein `rating: "low"` kann sie tendenziell dämpfen – es gibt keine feste Regel, der LLM
  entscheidet autonom.
- **Keyword-Kuration (Schritt 2):** Der Prompt enthält einen zusätzlichen Block
  `{{SKILL_RATINGS_SECTION}}`, der die Ratings auflistet. Der LLM kann Skills mit hohem Rating
  bei der Priorisierung stärker gewichten.
- **Gap-Analyse (Review):** Wirkt via denselben `{{ANALYSE_GRUNDSAETZE}}`-Mechanismus wie
  die Coverage-Analyse.

**Keine Wirkung auf:**
- Finales Profil (YAML-Draft, PDF) – `skills: string[]` bleibt flach
- Projekt-Ranking, Profil-Hook, Projekt-Adaption – hier wirkt das Rating nur indirekt
  über die Requirements-Map

Typdefinition: `ProfileSkill` (`name: string`, `rating?: "high" | "medium" | "low"`) in
`src/model/input/job-posting-input.ts`.

## Wichtige Architekturregeln

- **Strikte Schichtentrennung:** `src/core/`, `src/model/`, `src/adapters/`, `src/cli/`
- **Model importiert nichts aus Core/Cli/Adapters** – reine Typdefinitionen
- **Alle LLM-Calls über `createLlmClient()`** – kein direkter OpenAI-SDK-Zugriff
- **Secrets getrennt** in `secrets/secrets.local.yaml` (nicht versioniert)
- **Jeder Lauf erzeugt 3 Artefakte** in `runs/<run-id>/`: `profile-draft.yaml`, `run-meta.yaml`, `llm-traces.yaml`
- **Rohe Ausschreibung als Primärinput:** Relevante LLM-Schritte arbeiten direkt mit dem Ausschreibungstext und optionalen Steering-Hinweisen.
- **Requirements-Map als kompakter Zwischenvertrag:** Ein eigener LLM-Schritt bewertet Priorität, Coverage und Evidenztyp aller relevanten Anforderungen, zerlegt zusammengesetzte Anforderungen wenn nötig in atomare Einträge und steuert danach Keyword-Kuration, Ranking, Hook, Projektadaption und Run-Diagnostics.
- **Rein LLM-basiertes Ranking:** Keine regelbasierte Evidenz-Kalkulation, keine Reserve-Klassifikation, kein `projectSelection.policy` mehr.
- **Ohne Projekte kein Lauf:** Fehlt in den Quellen jede Projekthistorie, bricht die Pipeline mit Validierungsfehler ab.

## Datenmodelle

| Modell | Datei | Beschreibung |
|---|---|---|
| ProfileCompositionDecision | `src/model/composition/` | Section-Plan + Modi |
| RunDiagnostic | `src/model/diagnostics/` | Metriken + Schwächen |
| IntermediateModel | `src/model/schemas/` | Zod-validiertes Gesamtmodell |

## Konventionen für Profile

Profil-YAML (unter `tests/fixtures/profile-sources/`):

```yaml
name: "Vorname Nachname"
email: "..."
phone: "..."
location: "..."
title: "..."
availability: "ab MM/JJJJ"        # Verfügbarkeit
capacity: "bis zu 100%"            # Auslastung
onsiteWillingness: "bis zu 100%"    # Onsite-Bereitschaft
summary: "..."                      # Executive Summary
skills:
  - name: "Skill-Name"           # Pflicht
    rating: "high"               # Optional: Vertrautheit (high/medium/low) – dient als
                                 # weicher Kontext für Coverage-Analyse und Keyword-Kuration,
                                 # wird NICHT im finalen Profil ausgegeben
  - name: "Nächster Skill"
certifications:
  - "Zertifikatsname"
languages:
  - language: "Deutsch"
    level: "Muttersprache"
workExperience:
  - period: "MM/JJJJ–MM/JJJJ"
    role: "Rolle"
    company: "Firma"
education:
  - degree: "Abschluss"
    institution: "Hochschule"
    period: "MM/JJJJ–MM/JJJJ"
```

## Test-Strategie

- **Vitest** als Test-Runner
- **Deterministische Schritte** haben Unit-Tests (15 Testdateien, 44 Tests)
- **LLM-Schritte** werden in Unit-Tests gemockt – E2E-Läufe mit echten API-Calls
- Test-Fixtures in `tests/fixtures/` (Ausschreibungen, Profil, Projekte)

## CLI

```
freelancer-profil-tool run       # Pipeline ausführen
freelancer-profil-tool review    # Quellmaterial vorab prüfen
freelancer-profil-tool inspect   # Ergebnisse inspizieren
freelancer-profil-tool pdf       # PDF aus bestehendem Run generieren (ohne Pipeline-Neulauf)
```

Flags `run`:
- `-p, --posting <path>` – Ausschreibung (Pflicht)
- `-s, --sources <paths...>` – Quellen (kommasepariert oder mehrfach)
- `-t, --steering <hints...>` – Steuerhinweise (optional)
- `-c, --config <path>` – Config (optional, Default: config/default.yaml)
- `--language <de|en>` – Zielsprache des Profils (optional, Default: `de`)
- `--pdf` – Zusätzlich PDF aus dem generierten Profil erzeugen

Flags `review`:
- identisch zu `run`

## Produktive Quelldaten

Persönliche Profil- und Projektdaten (z. B. deine profil.yaml und projekte.yaml) gehören **nicht** in `tests/fixtures/`, sondern in das `sources/`-Verzeichnis. Dieses ist in `.gitignore` eingetragen und wird nicht mit in Git exportiert.

```
sources/
├── profil.yaml
├── projekte.yaml
└── ausschreibungen/
    └── product-owner.txt
```

Aufruf dann z. B.:
```bash
npx tsx src/cli/cli.ts run \
  -p sources/ausschreibungen/product-owner.txt \
  -s sources/profil.yaml \
  -s sources/projekte.yaml
```

Die `tests/fixtures/` enthalten dagegen nur anonymisierte Beispieldaten (`example-*`) und Testdaten – diese sind für GitHub bestimmt.

## Prompt-Templates

Alle LLM-Prompts liegen als YAML-Dateien in `prompts/` und werden zur Laufzeit geladen:

| Datei | Schritt | Platzhalter |
|---|---|---|
| `01-requirements-map-prompt.yaml` | analyze-requirements-coverage | `{{JSON_SCHEMA}}`, `{{POSTING_TEXT}}`, `{{STEERING_HINTS_SECTION}}`, `{{SOURCE_DATA_JSON}}` |
| `02-keywords-prompt.yaml` | curate-keywords | `{{PROJECT_TECHNOLOGIES}}`, `{{SKILL_RATINGS_SECTION}}`, `{{POSTING_TEXT}}`, `{{STEERING_HINTS_SECTION}}`, `{{REQUIREMENTS_MAP_ENTRIES}}`, `{{TARGET_COUNT}}` |
| `03-rank-projects-prompt.yaml` | rank-projects | `{{RANKING_JSON_SCHEMA}}`, `{{POSTING_TEXT}}`, `{{STEERING_HINTS_SECTION}}`, `{{PROJECTS_JSON}}`, `{{TARGET_COUNT}}`, `{{REQUIREMENTS_MAP_ENTRIES}}` |
| `04-profile-hook-prompt.yaml` | generate-hook | `{{POSTING_TEXT}}`, `{{STEERING_HINTS_SECTION}}`, `{{PROFILE_DATA_JSON}}`, `{{REQUIREMENTS_MAP_ENTRIES}}`, `{{TARGET_LANGUAGE}}` |
| `05-project-adaptation-prompt.yaml` | adapt-projects | `{{ADAPTATION_JSON_SCHEMA}}`, `{{POSTING_TEXT}}`, `{{STEERING_HINTS_SECTION}}`, `{{PROJECTS_JSON}}`, `{{REQUIREMENTS_MAP_ENTRIES}}`, `{{TARGET_LANGUAGE}}` |
| `06-gap-analysis-prompt.yaml` | review | `{{GAP_ANALYSIS_JSON_SCHEMA}}`, `{{POSTING_TEXT}}`, `{{STEERING_HINTS_SECTION}}`, `{{SOURCE_DATA_JSON}}` |

Jeder Nutzer kann die YAML-Dateien anpassen, um die Prompts auf sein Profil und seinen Stil zu optimieren, ohne den Code ändern zu müssen.

## PDF-Generierung (HTML → Playwright → PDF)

Zusätzlich zum Markdown-Draft kann die Pipeline ein pixelgenaues A4-PDF erzeugen.

### Ablauf

1. **HTML-Template** (`pdf-templates/profil-template.html`) wird mit `{{PLATZHALTERN}}` befüllt
2. **Playwright** (Headless-Chromium) rendert das HTML als A4-PDF
3. Die PDF landet als `profile-draft.pdf` neben dem Markdown-Draft im Run-Verzeichnis

### Verzeichnisstruktur

```
pdf-templates/
├── profil-template.html        # Vom Nutzer anpassbares HTML-Template mit CSS
└── assets/portrait.png         # Portrait-Foto des Freelancers

src/adapters/pdf/
├── profile-pdf-data.ts         # TypeScript-Datenmodell (ProfilePdfData)
├── render-profile-pdf.ts       # Template → Playwright → PDF
├── extract-pdf-data.ts         # Extrahiert Daten aus bestehendem Run (YAML)
└── write-profile-pdf.ts        # Schreibt PDF-Datei
```

### Nutzung

```bash
# Direkt nach dem Pipeline-Lauf
npx tsx src/cli/cli.ts run -p posting.txt -s profil.yaml -s projekte.yaml --pdf

# Nachträglich für einen bestehenden Run
npx tsx src/cli/cli.ts pdf <run-id>
```

### Konfiguration

```yaml
# config/default.yaml
pdf:
  templatePath: "pdf-templates/profil-template.html"   # Pfad zum HTML-Template
  appendPdfPath: "sources/anhang.pdf"                  # Optional: statisches PDF anhängen (z. B. CV)
```

Das HTML-Template verwendet **Handlebars** als Template-Engine. Schleifen (`{{#each projects}}`) und Bedingungen (`{{#ifPositive certifications}}`) werden direkt im HTML ausgewertet – kein TypeScript-Code nötig für Layout-Änderungen. Für das Portrait-Bild muss `pdf-templates/assets/portrait.png` aktualisiert werden. Details zum Datenmodell und eine Prompt-Vorlage zum Generieren/Anpassen des Templates per LLM findest du in `docs/user-guide.md`.



Die Anzahl Projekte und Keywords wird **ausschließlich über die Config** gesteuert (`pipeline.projectSelection.targetCount`, `pipeline.keywordSelection.targetCount`) – es gibt keine CLI-Overrides mehr.

## Verwandte Dokumente

- `docs/architecture.md` – Architektur mit Mermaid-Diagrammen
- `config/default.yaml` – LLM-Konfiguration
- `secrets/secrets.local.yaml` – API-Key (lokal, nicht versioniert)
