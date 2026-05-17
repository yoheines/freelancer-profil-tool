export type CoverageLevel = "gut_belegt" | "schwach_gestuetzt" | "unbelegt";
export type EvidenceType = "projekt" | "zertifikat" | "profil_skill" | "rolle" | "indirekt" | "keine";

export interface RequirementsMapEntry {
  requirement: string;
  priority: "hoch" | "mittel" | "niedrig";
  coverage: CoverageLevel;
  /** Welche Art von Evidenz den Eintrag am stärksten trägt. */
  evidenceType: EvidenceType;
  /** Konkretes Evidence-Zitat aus den Quellen (oder leer bei unbelegt) */
  keyEvidence: string;
}

export interface RequirementsMap {
  entries: RequirementsMapEntry[];
}
