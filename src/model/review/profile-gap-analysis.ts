export type GapStatus = "unbelegt" | "schwach_gestuetzt" | "gut_belegt";

export interface GapFinding {
  requirement: string;
  status: GapStatus;
  reasoning: string;
  suggestedEvidence: string;
  suggestedSourceLocation:
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
  priority: "hoch" | "mittel" | "niedrig";
  gapPriority?: "hoch" | "mittel" | "niedrig";
}

export interface ProfileGapAnalysis {
  overallAssessment: string;
  findings: GapFinding[];
}
