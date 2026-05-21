# So funktioniert das Tool

## Zweck

Das Freelancer-Profil-Tool erzeugt aus einer konkreten Ausschreibung und vorhandenen Quelldaten einen auf die Ausschreibung zugeschnittenen Profilentwurf.

Das System schreibt nicht einfach die Ausschreibung in anderen Worten neu, sondern arbeitet in mehreren fachlich getrennten Schritten. Jeder Schritt bekommt klar definierte Eingaben, erzeugt klar definierte Ausgaben und reicht diese an den nächsten Schritt weiter.

Dieses Dokument beschreibt diese Logik aus Anwendersicht.

## Welche Eingaben das System verwendet

Ein Lauf basiert auf vier Eingabearten:

1. **Ausschreibung**  
   Der Text, auf den das Profil ausgerichtet werden soll.

2. **Profilquelle**  
   Statische Informationen über die Person, zum Beispiel:
   - Kontaktdaten
   - Titel
   - Summary
   - Skills
   - Sprachen
   - Zertifikate
   - Verfügbarkeit
   - Auslastung
   - Onsite-Bereitschaft

 3. **Projektquelle**  
    Wiederverwendbare Projektliste mit einzelnen Referenzprojekten.

4. **Optionale Steuerhinweise**  
   Zusätzliche Vorgaben für diesen einen Lauf, zum Beispiel Schwerpunktsetzungen oder gewünschte Positionierung.

## Optionaler Vorab-Review

Vor einem eigentlichen `run` kann das Quellmaterial mit dem Befehl `review` gegen die Ausschreibung geprüft werden.

Ziel dieses Schritts:

- kritische Lücken früh sichtbar machen
- schwach gestützte Anforderungen erkennen
- konkrete Hinweise bekommen, welche Evidenz die Passung deutlich verbessern würde
- das Quellmaterial nachschärfen, **bevor** der eigentliche Profilentwurf erzeugt wird

Der Review erzeugt keinen Profilentwurf, sondern eine `gap-analysis.yaml`.

Die Gap-Analyse verwendet dieselben Analyse-Grundsätze (Granularität, implizite Anforderungen, Coverage-Definitionen) wie der Requirements-Map-Schritt im Hauptlauf – definiert in `prompts/_shared/analyse-grundsaetze.yaml`.

## Grundlogik des Laufs

Der Lauf beantwortet nacheinander diese Fragen:

1. Welche Skills und Projekte sind für genau diese Ausschreibung am relevantesten?
2. Welche Profilabschnitte sollen übernommen, angepasst oder neu erzeugt werden?
3. Wie entsteht daraus ein konsistenter Profilentwurf?
4. Welche Struktur und Metadaten liefert der Lauf für Nachvollziehbarkeit und Review?

## Schritt-für-Schritt-Ablauf

### 0. Eingaben laden und prüfen

**Eingangsinformationen**

- Ausschreibungstext
- Profilquelle
- Projektquelle
- optionale Steuerhinweise
- Konfiguration

**Verarbeitung**

- Das System prüft, ob alle benötigten Dateien vorhanden und lesbar sind.
- YAML-Dateien werden geparst.
- Die Konfiguration wird geladen.
- Wenn keine Projekthistorie mit mindestens einem Projekt vorliegt, bricht der Lauf hier ab.
- Ungültige oder fehlende Eingaben führen hier zum Abbruch.

**Ausgabe dieses Schritts**

- geladener Ausschreibungstext
- geladene Profil- und Projektdaten
- Laufkonfiguration

**Warum dieser Schritt wichtig ist**

Alle späteren Entscheidungen bauen auf diesen Daten auf. Wenn hier etwas fehlt oder falsch ist, soll der Lauf nicht mit stillschweigenden Annahmen fortfahren.

### 1. Anforderungsabdeckung bewerten

**Eingangsinformationen**

- Ausschreibungstext
- optionale Steuerhinweise
- Profilquelle
- Projektquelle

**Verarbeitung**

- Der LLM leitet alle relevanten Anforderungen aus der Ausschreibung ab – sowohl explizite als auch implizite (z. B. Change-Management bei Aufgabentiefe, Stakeholder-Management bei Schnittstellenbeschreibung).
- Für jede Anforderung bewertet er Priorität, Coverage und den Typ der stärksten Evidenz im vorhandenen Material.
- Zusammengesetzte Anforderungen werden bei Bedarf in atomare Einzelanforderungen zerlegt, wenn ihre Teilaspekte unterschiedlich gut belegt sind.
- Die Requirements-Map steuert danach die Gewichtung in Keyword-Kuration, Ranking, Hook, Projektadaption und Diagnostics.
- Die Analyse-Grundsätze (Granularität, implizite Anforderungen) sind zentral in `prompts/_shared/analyse-grundsaetze.yaml` definiert und gelten auch für die Gap-Analyse im Review-Befehl.

**Ausgabe dieses Schritts**

- Requirements-Map mit Priorität, Coverage, Evidenztyp und zentraler Evidenz je Anforderung

### 2. Relevante Skill-Keywords verdichten

**Eingangsinformationen**

- Ausschreibungstext
- optionale Steuerhinweise
- Profilquelle
- Projektquelle
- Requirements-Map

**Verarbeitung**

- Das System sammelt Skills, Zertifikate und Sprach-/Profilmerkmale aus Profil und Projekthistorie.
- Der LLM priorisiert daraus die relevantesten Keywords für die konkrete Ausschreibung bis zur konfigurierten Zielanzahl.
- Die Requirements-Map gibt vor, welche belegten Anforderungen besonders stark gewichtet werden sollen.
- Einfache Sprachangaben wie Deutsch werden nicht als Leitsignal-Keywords aufgenommen.

**Ausgabe dieses Schritts**

- priorisierte Keyword-Liste für Skills und Technologien

### 3. Dokumentstruktur und Headline planen

**Eingangsinformationen**

- Ausschreibungstext
- Profilquelle
- Projektquelle

**Verarbeitung**

- Das System legt die Abschnittsstruktur des Profils fest.
- Für jede Sektion wird entschieden, ob sie statisch, adaptiert oder generiert wird.
- Aus der ersten aussagekräftigen Zeile der Ausschreibung wird deterministisch eine Arbeits-Headline abgeleitet.

**Was hier mit "Beleg" gemeint ist**

Ein Beleg ist eine konkrete Information aus den gelieferten Quellen, die eine Anforderung stützen kann.

Beispiele:

- ein Projekt mit passender Technologie
- ein Zertifikat
- ein expliziter Skill-Eintrag im Profil
- eine Sprachangabe
- eine Verfügbarkeitsangabe

**Was hier mit "Coverage" (Beleglage) gemeint ist**

Das System klassifiziert jede Anforderung in eine von drei Coverage-Stufen:

- **`gut_belegt`** – klare, direkte Evidenz liegt vor (z. B. Projektbeschreibung, Zertifikat)
- **`schwach_gestuetzt`** – Evidenz ist nur indirekt aus Indizien ableitbar (z. B. Rolle, impliziter Kontext)
- **`unbelegt`** – keine Evidenz in den Quellen vorhanden

Jede Kombination aus Priorität (`hoch`/`mittel`/`niedrig`) und Coverage steuert, wie stark eine Anforderung in den Folgeschritten gewichtet werden darf. Die Logik ist zentral in `prompts/_shared/evidenz-strategie.yaml` definiert und wird von allen relevanten LLM-Schritten verwendet.

**Ausgabe dieses Schritts**

- Abschnittsplan für das Profil
- Bearbeitungsmodus je Abschnitt
- deterministische Arbeits-Headline für den späteren Entwurf

### 4. Projekte für den Entwurf auswählen und reihen

**Eingangsinformationen**

- Ausschreibungstext
- optionale Steuerhinweise
- Projektquelle
- Requirements-Map

**Verarbeitung**

- Der LLM bekommt alle verfügbaren Projekte zusammen mit dem Ausschreibungstext.
- Er bewertet die Projekte unmittelbar auf ihre Relevanz zur Ausschreibung und nutzt die Requirements-Map als priorisierten Zwischenvertrag.
- Er wählt die besten Projekte bis zur konfigurierten Zielanzahl.
- Wenn gar keine Projekte vorliegen, bricht der Lauf mit einem Validierungsfehler ab.

**Ausgabe dieses Schritts**

- finale Projektreihenfolge (Top N)
- Begründung je Projekt

### 5. Einleitung erzeugen

**Eingangsinformationen**

- Ausschreibung
- Quellen
- Requirements-Map

**Verarbeitung**

- Der LLM formuliert eine ausschreibungsnahe Einleitung auf Senior-Niveau direkt aus Ausschreibung, Profil und Projektdaten.
- Die Einleitung nutzt die Requirements-Map zur Gewichtung, darf aber keine Aussagen enthalten, die sich nicht aus den Quellen ableiten lassen.
- Die Evidenz-Strategie (`priority` × `coverage` aus der zentralen `prompts/_shared/evidenz-strategie.yaml`) steuert, wie stark eine Anforderung formuliert werden darf.
- Hookspezifische Regeln wie die verbotenen Signalwörter und die Beispiele zur Kalibrierung sind im Prompt-Template `04-profile-hook-prompt.yaml` definiert.

**Ausgabe dieses Schritts**

- Einleitungstext

### 6. Projekttexte adaptieren

**Eingangsinformationen**

- Abschnittsplan
- Ausschreibung
- Quellen
- Keywords
- Projektreihenfolge
- Requirements-Map

**Verarbeitung**

- Der LLM bearbeitet die ausgewählten Projekte in der festgelegten Reihenfolge.
- Aus Ausschreibung, Projekttext und Requirements-Map leitet er ab, welche Aspekte hervorzuheben sind.
- Die Evidenz-Strategie (Coverage × Priorität) gibt vor, ob und wie stark eine Anforderung im Projekttext betont werden darf.
- Alle Tatsachenangaben bleiben exakt erhalten – es werden keine Aufgaben, Technologien oder Ergebnisse hinzugefügt.
- Die Einleitung aus Schritt 5 wird in den passenden Abschnitt eingefügt.

**Ausgabe dieses Schritts**

- fertige Projektsektionen
- Einleitungstext (aus Schritt 5 übernommen)
- restliche Abschnitte als Platzhalter für die deterministische Komposition

### 7. Vollständigen Entwurf zusammensetzen

**Eingangsinformationen**

- Einleitung
- Projektsektionen
- Profilquellen (Skills, Zertifikate, Sprachen, Ausbildung, Karrierestationen)
- Schlüsselwörter (Keywords)
- Abschnittsplan

**Verarbeitung**

- Das System setzt die Sektionen in die finale Dokumentreihenfolge.
- **Qualifikationen** werden deterministisch aus den Profildaten aufgebaut: Kernkompetenzen (Keywords als kompakte Stichwortzeile und als ausführliche Liste), Zertifikate, Sprachen, Ausbildung und Karrierestationen.
- **Kontaktdaten** werden statisch aus dem Profil übernommen. 
- Die Arbeits-Headline wird aus der ersten Zeile der Ausschreibung abgeleitet.

**Ausgabe dieses Schritts**

- vollständiger Markdown-Profilentwurf

### 8. Diagnoseinformationen berechnen

**Eingangsinformationen**

- Kompositionsplan
- finaler Entwurf
- Laufzeiten und LLM-Nutzung

**Verarbeitung**

- Das System analysiert die Dauer des Laufs, den LLM-Token-Verbrauch und die Zusammensetzung des Entwurfs.
- Zusätzlich werden aus der Requirements-Map schwach gestützte und unbelegte Anforderungen als Schwächen und Nachschärfungsbedarf abgeleitet.

**Ausgabe dieses Schritts**

- strukturierte Diagnosedatei

### 9. Ergebnisse speichern

**Eingangsinformationen**

- Profilentwurf
- Zwischenmodell
- Diagnoseinformationen

**Verarbeitung**

- Das System legt einen neuen Lauf-Ordner an.
- Dort werden alle Ergebnisse getrennt gespeichert.

**Ausgabe dieses Schritts**

- `profile-draft.yaml` (editierbares YAML, generierte Inhalte + Stammdaten)
- `run-meta.yaml` (Pipeline-Metadaten + Diagnostics)
- `llm-traces.yaml` (Prompt/Response-Traces)

## Welche Datei wofür da ist

### `profile-draft.yaml`

Das editierbare YAML-Profil – generierte Inhalte (Summary, Skills, Projekttexte) zuerst, dann Stammdaten. Wenn du Text anpassen möchtest (z. B. die Summary oder eine Projektbeschreibung), editierst du diese Datei und erzeugst dann das PDF neu.

### `run-meta.yaml`

**Fachliche Herleitung + Diagnose in einer Datei.** Enthält:
- Requirements Map (Anforderungen, Priorität, Coverage, Evidenz)
- Ausgewählte Keywords
- Projekt-Ranking mit Begründungen
- Kompositionsplan (Abschnitte + Modi)
- Laufzeiten, LLM-Nutzung
- Strukturelle Schwächen und Nachschärfungsvorschläge

### `llm-traces.yaml`

Die technischen Prompt-/Response-Traces. Diese Datei ist vor allem für tiefere Analyse und Debugging relevant.

## Wichtige fachliche Grundsätze

1. Das System soll keine unbelegten Stärken als Fakten ausgeben.
2. Ein Lauf ist ein einzelner Durchlauf, keine automatische Optimierungsschleife.

## Wie du die Logik eines einzelnen Laufs nachvollziehst

Wenn du verstehen willst, warum ein konkreter Entwurf so aussieht:

1. `profile-draft.yaml` lesen
2. `run-meta.yaml` auf Lücken, Warnhinweise und fachliche Herleitung prüfen

So lässt sich fachlich nachvollziehen:

- was das System aus der Ausschreibung gelesen hat
- welche Aussagen es belegen konnte
- welche Projekte es warum ausgewählt hat
- an welchen Stellen der Entwurf vorsichtig oder unvollständig bleiben musste
