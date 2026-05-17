---
project_name: 'freelancer-profil-tool'
user_name: 'Johannes'
date: '2026-05-15'
status: 'complete'
sections_completed:
  - technology_stack
  - language_rules
  - architecture_rules
  - testing_rules
  - code_style
  - critical_rules
rule_count: 24
optimized_for_llm: true
---

# Project Context for AI Agents

_Diese Datei enthält kritische Regeln und Patterns, die AI-Agenten befolgen müssen, wenn sie Code in diesem Projekt implementieren. Fokus auf unauffällige Details, die Agenten sonst übersehen._

---

## Technology Stack & Versions

### Runtime
- Node.js ≥ 22 (ESM, `"type": "module"`)
- TypeScript ^6.0.3, strict mode

### Core Dependencies
- `commander` ^14.0.3 – CLI-Framework
- `openai` ^6.37.0 – OpenAI-kompatibler LLM-Client
- `yaml` ^2.9.0 – YAML-Parsing/Serialisierung
- `zod` ^4.4.3 – Schema-Validierung

### Dev Dependencies
- `tsx` ^4.21.1 – TypeScript-Ausführung
- `vitest` ^4.1.6 – Test-Runner
- `typescript` ^6.0.3

### Config-Dateien
- `tsconfig.json` – target es2022, module nodenext, strict: true
- `config/default.yaml` – LLM-Modell, Provider, Workspace-Pfade
- `config/default.yaml` enthält auch `projectSelection.policy` mit `evidence_only` | `evidence_first` | `semantic_fallback` (Default: `evidence_first`)
- `secrets/secrets.local.yaml` – API-Key (nicht versioniert, in `.gitignore`)

---

## Critical Implementation Rules

### Language-Specific Rules

- **TypeScript strict mode** ist aktiv – keine impliziten `any`, keine `null`-Checks umgehen
- **ESM-Imports mit `.js`-Extension:** `import { ... } from "./file.js"` (nie ohne Extension)
- **Eigene Error-Hierarchie:** `AppError` → `ConfigError` | `ValidationError` | `PipelineStepError` – jeder Error hat `code` + `message` + `details?` + `hint?`
- **Async/await bevorzugt**, keine rohen Promises oder Callback-Patterns
- **`type`-Imports trennen:** `import type { Foo } from "..."` für reine Typ-Importe
- **Dateinamen:** `kebab-case.ts`, Testdateien: `*.test.ts` (nebendran, nicht in `tests/`-Unterordnern)

### Architektur-Regeln

- **Strikte Schichtentrennung:** `src/core/` → `src/adapters/` → `src/model/` – Importe nur in diese Richtung
- **Model ist frei von Imports aus Core/Cli/Adapters** – reine Typdefinitionen, keine Seiteneffekte
- **Pipeline-Schritte** in `src/core/pipeline/steps/` sind eigenständige async-Funktionen, keine Klassen
- **LLM-Calls** gehen alle durch `createLlmClient()` in `adapters/llm/openai-compatible-client.ts`
- **CLI-Befehle** in `src/cli/commands/` – keine Geschäftslogik in der CLI, nur Orchestrierung
- **Pipeline Orchestrator** ist `src/core/pipeline/run-profile-pipeline.ts` – hier werden alle Schritte sequenziell gesteuert

### Pipeline-Spezifische Regeln

- **6 LLM-Calls** in fester Reihenfolge (siehe AGENTS.md oder docs/architecture.md)
- **`relevanceScore` in EvidenceItem** wird vom LLM angefordert und bei Bedarf deterministisch aus `confidence` abgeleitet; projektbezogene Evidenz wird spaeter an die Projektadaption durchgereicht
- **FR18-Warnhinweis** wird automatisch aus `evidence.unsupportedRequirements` generiert und bezieht sich auf fehlende Belege in den vorhandenen Quellen, nicht nur in Projekten
- **Profil-YAML** kann `availability`, `capacity`, `onsiteWillingness` enthalten – das LLM nutzt diese Felder automatisch über den JSON-Dump
- **Projektauswahl ist konfigurierbar:** `projectSelection.policy` steuert, ob nur direkte Evidenz (`evidence_only`), direkte Evidenz mit Reserve-Auffuellung (`evidence_first`) oder ein semantischer Fallback (`semantic_fallback`) gilt
- **Reserveprojekte muessen sichtbar bleiben:** Diagnostics und finale Projektlisten duerfen Reserve-Fallback nicht als gleichwertige Kernevidenz verschleiern

### Testing Rules

- **Vitest** als Test-Runner, `describe`/`it`/`expect`-Pattern
- **Deterministische Schritte sowie Prompt-/Normalizer-Helfer** werden getestet – LLM-Schritte selbst werden nicht gemockt
- **Fixtures** in `tests/fixtures/`: Ausschreibungen (`job-postings/`), Profile (`profile-sources/`), Projekte (`project-histories/`)
- **Bei neuen deterministischen Schritten und Hilfsbausteinen** Tests ergänzen und bestehende Semantik absichern

### Code Quality & Style

- **Keine ESLint/Prettier-Config** – TypeScript strict mode ist der einzige Qualitäts-Gate
- **Projekt-Sprache Deutsch** für Prompts, Outputs, Code-Kommentare und Doku
- **Nominalstil** in generierten Profiltexten: "Steuerung/Leitung/Konzeption…", kein "Ich" oder Passiv
- **Verbotene Floskeln** in Prompts: "verantwortete ich", "trieb … voran", "unterstreichen meine Erfahrung", "mit Fokus auf", "mit Schwerpunkt auf"
- **`AppError`-Instanzen** werfen bei Fehlern, keine nackten `throw new Error()`

### Critical Don't-Miss Rules

- **Pipeline niemals auto-iterieren** – ein Lauf = ein Durchlauf, keine Schleifen
- **Secrets nie in Logs oder Artefakten** – `secrets/` ist in `.gitignore`
- **YAML-Validierung mit Zod** vor dem Schreiben von `intermediate.yaml`
- **`--sources` CLI-Flag** unterstützt Mehrfachnennung (`-s a.yaml -s b.yaml`) und Komma-Separation (`-s a.yaml,b.yaml`)
- **`runs/<run-id>/`** enthält 4 Artefakte: `profile-draft.md`, `intermediate.yaml`, `diagnostics.yaml`, `llm-traces.yaml`

---

## Usage Guidelines

**Für AI-Agenten:**
- Diese Datei vor jeder Code-Änderung lesen
- Alle Regeln exakt befolgen
- Bei Zweifel die restriktivere Option wählen
- Bei neuen Patterns die Datei ergänzen

**Für Menschen:**
- Bei Tech-Stack-Änderungen aktualisieren
- Veraltete Regeln entfernen
- Schlank halten – nur unauffällige Details, keine Binsenweisheiten

Letztes Update: 2026-05-15
