# Freelancer Profil Tool

CLI-Tool zur Generierung maßgeschneiderter Freelancer-Profile aus Job-Ausschreibungen.

Das Tool erzeugt aus Ausschreibung, `profil.yaml` und `projekte.yaml` einen ausschreibungsspezifischen `profile-draft.yaml`, optional zusätzlich ein PDF. Die Pipeline arbeitet mit 5 LLM-Calls und mehreren deterministischen Zwischenschritten.

## Dokumente

- [`docs/user-guide.md`](docs/user-guide.md) – vollständige Schritt-für-Schritt-Anleitung
- [`docs/how-it-works.md`](docs/how-it-works.md) – fachliche Logik des Laufs aus Anwendersicht
- [`docs/architecture.md`](docs/architecture.md) – technische Architektur, Datenfluss und Komponenten

## Schnellstart

```bash
git clone <repo>
cd freelancer-profil-tool
npm install
```

API-Key in `secrets/secrets.local.yaml` hinterlegen:

```yaml
apiKey: "dein-openai-kompatibler-key"
```

Erster Lauf mit eigenen Daten:

```bash
npx tsx src/cli/cli.ts run \
  -p sources/ausschreibungen/meine-ausschreibung.txt \
  -s sources/profil.yaml \
  -s sources/projekte.yaml \
  --language de
```

Vorab-Review gegen die Ausschreibung:

```bash
npx tsx src/cli/cli.ts review \
  -p sources/ausschreibungen/meine-ausschreibung.txt \
  -s sources/profil.yaml \
  -s sources/projekte.yaml
```

HTML-Inspect für einen vorhandenen Lauf erzeugen:

```bash
npx tsx src/cli/cli.ts inspect <run-id>
```

PDF direkt mitgenerieren oder nachträglich erzeugen:

```bash
npx tsx src/cli/cli.ts run \
  -p sources/ausschreibungen/meine-ausschreibung.txt \
  -s sources/profil.yaml \
  -s sources/projekte.yaml \
  --pdf

npx tsx src/cli/cli.ts pdf <run-id>
```

## CLI-Befehle

| Befehl | Zweck |
|---|---|
| `run` | Vollständige Pipeline ausführen |
| `review` | Quellen vorab gegen die Ausschreibung prüfen |
| `inspect <run-id>` | Selbstständige HTML-Inspect-Seite erzeugen |
| `pdf <run-id>` | PDF aus einem bestehenden Run erzeugen |

Wichtige `run`-Flags:

- `-p, --posting <path>` – Ausschreibung (Pflicht)
- `-s, --sources <paths...>` – Quellen (Profil + Projekte; mehrfach oder kommasepariert)
- `-t, --steering <hints...>` – optionale Steuerhinweise
- `-c, --config <path>` – alternative Config-Datei
- `--language <de|en>` – Zielsprache des Profils
- `--pdf` – zusätzlich `profile-draft.pdf` erzeugen

Die Anzahl Projekte und Keywords wird ausschließlich über `config/default.yaml` gesteuert:

- `pipeline.projectSelection.targetCount`
- `pipeline.keywordSelection.targetCount`

## Quelldatenmodell

### `profil.yaml`

Profil-Skills können ein optionales Vertrautheits-Rating tragen:

```yaml
skills:
  - name: "Projektmanagement"
    rating: "high"
  - name: "CRM"
    rating: "medium"
```

Diese Ratings wirken heute als weiches Gewichtungssignal in Coverage-Analyse, Gap-Analyse und Keyword-Kuration.

### `projekte.yaml`

Projekt-Skills sind fachliche Evidenz pro Projekt:

```yaml
skills:
  - name: "SAP IS-U"
    context: "Operative Nutzung im Tagesgeschäft bei Kundenanfragen; relevant als praktische Systemkenntnis im energiewirtschaftlichen Kontext."
  - name: "Stakeholder-Management"
    context: "Abstimmung mit Fachbereich, Kundenservice, Produktmanagement und externen Dienstleistern."
```

Der `context` ist bewusst roh und ehrlich formuliert. Er wird nicht zwingend wörtlich übernommen, sondern dient dem LLM als belastbare Zusatzinformation für Ranking und Projektadaption.

## Ergebnisse eines Laufs

Nach `run` liegen in `runs/<run-id>/` die Kernartefakte:

| Datei | Beschreibung |
|---|---|
| `profile-draft.yaml` | Editierbarer Profilentwurf im strukturierten YAML-Format |
| `run-meta.yaml` | Requirements-Map, Keywords, Projekt-Ranking, Kompositionsplan, Diagnostics |
| `llm-traces.yaml` | Vollständige Prompt-/Response-Traces aller LLM-Calls |

Optionale bzw. nachgelagerte Artefakte:

| Datei | Entsteht wann? |
|---|---|
| `review.html` | nach `review` |
| `profile-draft.pdf` | nach `run --pdf` oder `pdf <run-id>` |
| `inspect.html` | nach `inspect <run-id>` |

## PDF-Generierung

Die PDF wird aus `profile-draft.yaml` über ein HTML-Template erzeugt:

1. `pdf-templates/profil-template.html` mit Handlebars-Platzhaltern füllen
2. per Playwright als A4-PDF rendern
3. optional statisches PDF aus `pdf.appendPdfPath` anhängen

Relevante Config-Werte:

```yaml
pdf:
  templatePath: "pdf-templates/profil-template.html"
  appendPdfPath: "sources/anhang.pdf"
```

## Tests

```bash
npm test
npx tsc --noEmit
```

## Architektur in Kurzform

- **Ausschreibung als Primärinput** für alle relevanten LLM-Schritte
- **Requirements-Map** als Zwischenvertrag für Gewichtung und Evidenzstärke
- **LLM-basiertes Projekt-Ranking** ohne regelbasierte Logik
- **Strukturierter YAML-Draft** als Primärformat statt Markdown-Draft
- **HTML-Inspect** als eigenständiger Review-Output für abgeschlossene Runs

Für Details siehe [`docs/architecture.md`](docs/architecture.md).
