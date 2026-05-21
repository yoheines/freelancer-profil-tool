import type { CompositionMode } from "../composition/composition-mode.js";

export interface DraftSection {
  name: string;
  content: string;
  compositionMode: CompositionMode;
  evidenceRefs: string[];
  sourceItem?: string;
}

/**
 * Structured YAML data for profile-draft.yaml.
 * Generated content first, then static profile data.
 */
export interface ProfileYamlData {
  /** Generierte Texte (editierbar, zuerst in der Datei) */
  summary: string;
  skills: string[];
  projects: YamlProject[];

  /** Stammdaten aus Quellen (unverändert) */
  name: string;
  title: string;
  tagline: string;
  email: string;
  phone: string;
  location: string;
  availabilityText: string;
  certifications: string[];
  education: YamlEducation[];
  languages: YamlLanguage[];
}

export interface YamlProject {
  title: string;
  client: string;
  branch: string;
  period: string;
  description: string;
}

export interface YamlEducation {
  degree: string;
  institution: string;
  period: string;
}

export interface YamlLanguage {
  lang: string;
  level: string;
}
