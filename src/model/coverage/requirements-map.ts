export type CoverageLevel = "gut_belegt" | "schwach_gestuetzt" | "unbelegt";
export type EvidenceType = "projekt" | "zertifikat" | "profil_skill" | "rolle" | "indirekt" | "keine";
export type RequirementPriority = "hoch" | "mittel" | "niedrig";
export type SuggestedSourceLocation =
  | "summary"
  | "skills"
  | "certifications"
  | "languages"
  | "projektbeschreibung"
  | "workExperience"
  | "availability"
  | "capacity"
  | "onsiteWillingness"
  | "sonstiges";

export interface RequirementsMapEntry {
  requirement: string;
  priority: RequirementPriority;
  coverage: CoverageLevel;
  /** Welche Art von Evidenz den Eintrag am stärksten trägt. */
  evidenceType: EvidenceType;
  /** Konkretes Evidence-Zitat aus den Quellen (oder leer bei unbelegt) */
  keyEvidence: string;
  /** Kurze fachliche Begründung der Bewertung */
  reasoning?: string;
  /** Konkreter Vorschlag, welche Evidenz die Passung verbessern würde */
  suggestedEvidence?: string;
  /** Empfohlener Zielort für die Nachschärfung */
  suggestedSourceLocation?: SuggestedSourceLocation;
  /** Dringlichkeit, die Lücke im Material zu schließen */
  gapPriority?: RequirementPriority;
}

export interface RequirementsMap {
  entries: RequirementsMapEntry[];
}
