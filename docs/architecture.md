# Architektur — Freelancer Profil Tool

## Überblick

Das Freelancer Profil Tool generiert aus einer Ausschreibung (Job Posting) und vorhandenem Quellmaterial (Profil, Projekthistorie) einen massgeschneiderten YAML-Profilentwurf. Optional können daraus zusätzlich ein PDF und ein HTML-Inspect-Report erzeugt werden. Die Verarbeitung erfolgt als schlanke Pipeline mit fünf LLM-Calls und mehreren deterministischen Zwischenschritten.

Die Ausschreibung wird **direkt** an die relevanten LLM-Schritte übergeben. Eine kompakte Requirements-Map bewertet zusätzlich Priorität, Coverage und Evidenztyp der Anforderungen, zerlegt zusammengesetzte Anforderungen bei Bedarf in atomare Einträge und steuert danach Keyword-Kuration, Projekt-Ranking, Hook, Projektadaption und die Run-Diagnostics. Profil-Skill-Ratings wirken als weiches Gewichtungssignal; Projekt-Skill-Kontexte liefern zusätzliche Evidenz, wie ein Skill im jeweiligen Projekt tatsächlich vorkam. Das Projekt-Ranking ist rein LLM-basiert: Der LLM bekommt alle Projekte + Ausschreibung und wählt die relevantesten Projekte bis zur konfigurierten Zielanzahl aus.

---

## Komponentenarchitektur

```mermaid
graph TB
    subgraph CLI["src/cli/ — CLI Entry Point"]
        CLI_MAIN["cli.ts"]
        CMD_RUN["commands/run-profile-generation.ts"]
        CMD_REVIEW["commands/review-profile-fit.ts"]
        CMD_INSPECT["commands/inspect-run.ts"]
        CMD_PDF["commands/generate-profile-pdf.ts"]
    end

    subgraph CORE["src/core/ — Geschäftslogik"]
        PIPELINE["pipeline/run-profile-pipeline.ts"]
        STEPS["pipeline/steps/*.ts<br/>(10 Schritt-Dateien)"]
    end

    subgraph MODEL["src/model/ — Datenmodelle"]
        COMP["composition/"]
        DRAFT["draft/"]
        DIAG["diagnostics/"]
        SCHEMA["schemas/intermediate-schema.ts"]
    end

    subgraph ADAPTERS["src/adapters/ — Externe Anbindungen"]
        LLM["llm/ — OpenAI-kompatibler Client"]
        FILES["filesystem/ — YAML/Datei-I/O"]
        CONFIG["config/ — App & Secrets Config"]
        PDF["pdf/ — HTML → Playwright → PDF"]
    end

    subgraph SHARED["src/shared/ — Hilfsfunktionen"]
        ERR["errors/app-error.ts"]
        IDS["ids/create-run-id.ts"]
        SKILLS["skills/ — Skill-Normalisierung"]
    end

    CLI_MAIN --> CMD_RUN
    CLI_MAIN --> CMD_REVIEW
    CLI_MAIN --> CMD_INSPECT
    CLI_MAIN --> CMD_PDF
    CMD_RUN --> PIPELINE
    CMD_REVIEW --> LLM
    CMD_REVIEW --> FILES
    PIPELINE --> STEPS
    STEPS --> LLM
    STEPS --> FILES
    STEPS --> MODEL
    CMD_INSPECT --> FILES
    CMD_INSPECT --> MODEL
    CMD_PDF --> PDF
    CMD_PDF --> CONFIG
```

### Schichten

| Schicht | Zweck | Enthält |
|---|---|---|
| `src/cli/` | CLI-Kommandozeilen-Einstieg | `run`-, `review`-, `inspect`- und `pdf`-Befehle, Presenter |
| `src/core/` | Orchestrierung der Pipeline | Pipeline-Orchestrator + 10 Schritt-Dateien |
| `src/model/` | Typsichere Datenmodelle | Composition, Draft, Diagnostics, Input, Schemas |
| `src/adapters/` | Externe Abhängigkeiten | LLM-Client, Dateisystem, Config-Loader, PDF-Rendering |
| `src/shared/` | Allgemeine Helfer | Fehlerklassen, IDs, Text- und Skill-Normalisierung |

### Architekturregeln

- **Core verwendet keine Adapter direkt** – nur über definierte Schnittstellen
- **Model ist frei von Imports aus Core/Cli/Adapters** – reine Typdefinitionen
- **Jeder LLM-Call geht durch den zentralen `createLlmClient()`** – kein direkter SDK-Zugriff
- **Secrets nie in Logs oder Artefakten** – getrennte Config (`secrets.local.yaml`)
- **Rein LLM-basiertes Ranking:** Keine regelbasierte Evidenz-Kalkulation oder Reserve-Klassifikation. Der LLM rankt Projekte rein anhand ihrer Beschreibung, Skills, Skill-Kontexte und Metadaten.

---

## Pipeline-Flow

```mermaid
flowchart TB
    START(["Ausschreibung + Profil + Projekte"])

    L0["1: load-inputs<br/>Dateien lesen"]:::det

    M["2: analyze-requirements-coverage 🧠<br/>> Requirements-Map erzeugen"]:::llm

    C["3: curate-keywords 🧠<br/>> Skills priorisieren"]:::llm

    D["4: plan-composition<br/>> Section-Modi festlegen"]:::det

    R["5: rank-projects 🧠<br/>> Relevante Projekte rein LLM-basiert"]:::llm

    F["6: generate-hook 🧠<br/>> Einleitung generieren"]:::llm

    G["7: adapt-projects 🧠<br/>> Projekte im Batch adaptieren<br/>> Nominalstil"]:::llm

    H["8: compose-yaml<br/>> YAML-Draft zusammensetzen"]:::det

    I["9: evaluate-diagnostics<br/>> Metriken + Schwächen"]:::det

    J["10: persist-artifacts<br/>> 3 Kernartefakte schreiben"]:::det

    START --> L0 --> M --> C --> D --> R --> F --> G --> H --> I --> J

    classDef llm fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    classDef det fill:#f3e5f5,stroke:#7b1fa2,stroke-width:2px
```

Legende: 🧠 = LLM-Call (blau) · Deterministische Schritte (violett)

### Pipeline-Schritte im Detail

| # | Schritt | Typ | LLM-Call | Eingabe | Ausgabe |
|---|---|---|---|---|---|
| 1 | load-inputs | deterministisch | – | Dateipfade | Geparste YAML/Text-Dateien |
| 2 | analyze-requirements-coverage | LLM | 1 | Ausschreibung + Quellen | Requirements-Map mit Priority/Coverage/Evidenztyp |
| 3 | curate-skill-keywords | LLM | 2 | Ausschreibung + Profil + Projekte + Requirements-Map | Top-10-Keywords |
| 4 | plan-composition | deterministisch | – | Ausschreibung + Quellen | Headline + Section-Plan mit Modi |
| 5 | rank-projects | LLM | 3 | Alle Projekte + Ausschreibung + Requirements-Map | Top N gerankt (rein LLM-basiert) |
| 6 | generate-profile-hook | LLM | 4 | Ausschreibung + Quellen + Requirements-Map | Einleitungstext |
| 7 | adapt-project-descriptions | LLM | 5 | Gerankte Projekte + Ausschreibung + Requirements-Map | Adaptierte Projekttexte |
| 8 | compose-yaml | deterministisch | – | Alle Sections | `profile-draft.yaml` als strukturiertes YAML |
| 9 | evaluate-diagnostics | deterministisch | – | YAML-Draft + Metadaten | Diagnostics |
| 10 | persist-artifacts | deterministisch | – | Alle Daten | `profile-draft.yaml`, `run-meta.yaml`, `llm-traces.yaml` |

Hinweis: `adapt-project-descriptions` zählt als **ein** LLM-Call (Batch). Die Pipeline hat damit insgesamt **5 LLM-Calls**.

### Anwenderdokumentation

Die technische Architektur bleibt in diesem Dokument bewusst kompakt.

Für eine **fachliche, schrittweise Erklärung aus Anwendersicht** siehe:

- [`docs/how-it-works.md`](how-it-works.md)

---

## Datenfluss

```mermaid
flowchart TB
    subgraph INPUTS["Eingabe-Dateien"]
        POSTING["ausschreibung.txt"]
        PROFILE["profil.yaml<br/>(Kontakt, Skills,<br/>Sprachen, Zertifikate,<br/>Verfügbarkeit, …)"]
        PROJECTS["projekte.yaml<br/>(Projekte mit Beschreibung,<br/>Skills und optionalem Kontext)"]
    end

    subgraph META["Lauf-Metadaten (run-meta.yaml)"]
        COMP["compositionPlan"]
        REQ["requirementsMap"]
        KW["skillKeywords"]
        RANK["projectRankings"]
    end

    subgraph OUTPUTS["Ausgabe-Dateien"]
        YAML["profile-draft.yaml"]
        METAFILE["run-meta.yaml"]
        TRACES["llm-traces.yaml"]
    end

    REQ -->|"curate-keywords"| KW
    POSTING & PROFILE & PROJECTS -->|"curate-keywords"| KW
    POSTING -->|"plan-composition"| COMP
    POSTING & PROFILE & PROJECTS -->|"analyze-requirements-coverage"| REQ
    POSTING & PROJECTS -->|"rank-projects"| RANK
    REQ -->|"rank-projects"| RANK

    COMP -->|"compose-yaml"| YAML
    REQ -->|"generate-hook / adapt-projects"| YAML
    REQ -->|"run-meta"| META
    KW -->|"compose-yaml"| YAML
    RANK -->|"compose-yaml"| YAML

    COMP -->|"run-meta"| META
    META --> METAFILE
    POSTING & PROFILE & PROJECTS -->|"LLM-Calls"| TRACES
```

---

## LLM-Prompt-Architektur

```mermaid
graph LR
    subgraph PROMPTS["src/adapters/llm/prompt-builder/"]
        SK["→ curate-skill-keywords.ts<br/>(Prompt inline im Step)"]
        RMP["requirements-map-prompt.ts<br/>> Coverage- und Fit-Analyse"]
        RKP["rank-projects-prompt.ts<br/>> Ranking-Kriterien"]
        HP["profile-hook-prompt.ts<br/>> Einleitung schreiben"]
        AP["project-adaptation-prompt.ts<br/>> Batch-Adaption<br/>> Nominalstil + Verbotsliste"]
    end

    subgraph NORMALIZER["src/adapters/llm/response-normalizers/"]
        NRM["normalize-requirements-map.ts"]
        NPR["normalize-project-ranking.ts"]
        NH["normalize-profile-hook.ts"]
        NB["normalize-batch-project-adaptations.ts"]
    end

    subgraph CLIENT["src/adapters/llm/"]
        OC["openai-compatible-client.ts<br/>> createLlmClient()"]
    end

    RMP -->|"Response"| NRM
    RKP -->|"Response"| NPR
    HP -->|"Response"| NH
    AP -->|"Response"| NB

    RMP --> OC
    RKP --> OC
    HP --> OC
    AP --> OC
```

Der `review`-Befehl nutzt dieselbe Requirements-/Fit-Analyse wie Schritt 1 des Hauptlaufs. Es gibt keinen separaten Gap-Analyse-Prompt mehr.

---

## CLI-Befehle

```mermaid
flowchart LR
    CLI["freelancer-profil-tool"]
    
    CLI --> RUN["run<br/>> Pipeline ausführen"]
    CLI --> REVIEW["review<br/>> Quellen vorab prüfen"]
    CLI --> INSPECT["inspect &lt;run-id><br/>> HTML-Inspect erzeugen"]
    CLI --> PDFCMD["pdf &lt;run-id><br/>> PDF erzeugen"]

    RUN -->|"-p/--posting"| POST["Ausschreibung (.txt)"]
    RUN -->|"-s/--sources"| SRC["Quellen (YAML)<br/>> Profil + Projekte"]
    RUN -->|"-t/--steering"| STEER["Steuerhinweise"]
    RUN -->|"-c/--config"| CFG["Config (optional)"]
    RUN -->|"--language"| LANG["Profilsprache"]

    REVIEW -->|"-p/--posting"| POST
    REVIEW -->|"-s/--sources"| SRC
    REVIEW -->|"-t/--steering"| STEER
    REVIEW -->|"-c/--config"| CFG

    INSPECT -->|"Liest"| META["runs/&lt;run-id>/run-meta.yaml"]
    PDFCMD -->|"Liest"| YAMLFILE["runs/&lt;run-id>/profile-draft.yaml"]
```

---

## Output-Struktur

```
runs/
├── <run-id/>                  # Eindeutige Lauf-ID (z. B. 20260521-3810ca)
│   ├── profile-draft.yaml     # Editierbares YAML-Profil (generiert + Stammdaten)
│   ├── run-meta.yaml          # Pipeline-Metadaten + Diagnostics
│   ├── llm-traces.yaml        # Prompt/Response pro LLM-Call
│   ├── profile-draft.pdf      # Optional, nach --pdf oder pdf <run-id>
│   └── inspect.html           # Optional, nach inspect <run-id>
│
├── <review-run-id>/           # Review-Lauf (gleiches ID-Format)
│   └── review.html            # Browserlesbarer Preflight-Report
```

---

## Verzeichnisbaum (src/)

```
src/
├── adapters/
│   ├── config/                # App & Secrets Config laden
│   ├── filesystem/            # Datei-I/O (YAML, Run-Artefakte)
│   ├── llm/
│   │   ├── prompt-builder/    # 5 Prompt-Builder + 1 Inline (Keywords)
│   │   ├── response-normalizers/  # 5 Normalizer
│   │   └── openai-compatible-client.ts
│   ├── pdf/                   # YAML → Handlebars → Playwright → PDF
│   └── serialization/         # YAML-Parsing
├── cli/
│   ├── commands/              # run, review, inspect, pdf
│   ├── parsers/               # CLI-Optionen parsen
│   └── presenters/            # Ausgabe-Formatter
├── core/
│   └── pipeline/
│       ├── steps/             # 10 Schritt-Dateien (+ Test-Dateien)
│       ├── run-profile-pipeline.ts
│       ├── pipeline-context.ts
│       └── pipeline-result.ts
├── model/
│   ├── composition/           # Section-Plan, Headline
│   ├── config/                # TypeScript-Types für Config
│   ├── diagnostics/           # RunDiagnostic
│   ├── draft/                 # DraftSection, ProfileDraft
│   ├── input/                 # RunInputs, SourceDocument
│   └── schemas/               # Zod-Schema für Validierung
└── shared/
    ├── errors/                # AppError-Hierarchie
    ├── ids/                   # Run-ID-Generator
    ├── skills/                # Skill-Normalisierung / Prompt-Serialisierung
    └── text/                  # Text-Normalisierung
```
