/**
 * Input types for a single pipeline run.
 */

export interface JobPostingInput {
  /** Raw text of the job posting / Ausschreibung */
  raw: string;
  /** Optional file path the text was loaded from */
  sourcePath?: string;
}

export interface ProfileSourceInput {
  /** Structured profile data (skills, contact, summary, etc.) */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Vertrautheits-Rating für Profil-Skills.
 * Dient als weicher Kontext für Coverage-Analyse und Keyword-Kuration.
 * Wird NICHT im finalen Profil ausgegeben.
 */
export type SkillRating = "high" | "medium" | "low";

/**
 * Ein Skill im Quell-Profil mit optionalem Vertrautheits-Rating.
 */
export interface ProfileSkill {
  name: string;
  rating?: SkillRating;
}

/**
 * Ein Skill in der Projekthistorie mit optionalem Kontext.
 * Der Kontext dient als rohe Evidenz, aus der der LLM spaeter
 * eine passende Formulierung ableiten kann.
 */
export interface ProjectSkill {
  name: string;
  context?: string;
}

export type ProjectSkillInput = string | ProjectSkill;

export interface ProjectHistoryInput {
  /** List of past projects with descriptions */
  projects: ProjectEntry[];
}

export interface ProjectEntry {
  id: string;
  title: string;
  description: string;
  skills?: ProjectSkillInput[];
  duration?: string;
}

export interface SteeringInput {
  /** Optional hints the user provides to influence the result */
  hints: string[];
}

export interface RunInputs {
  posting: JobPostingInput;
  sources: SourceDocument[];
  steering: SteeringInput;
  targetLanguage?: string;
}

export interface SourceDocument {
  type: "profile" | "project-history";
  path: string;
  content: ProfileSourceInput | ProjectHistoryInput;
}
