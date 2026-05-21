/**
 * Data model for the PDF profile renderer.
 * Diese Daten werden aus der Pipeline extrahiert und ins HTML-Template injiziert.
 */

export interface PdfProject {
  title: string;
  client: string;
  branch: string;
  period: string;
  desc: string;
}

export interface PdfEducation {
  degree: string;
  institution: string;
  period: string;
}

export interface PdfLanguage {
  lang: string;
  level: string;
}

export interface ProfilePdfData {
  name: string;
  title: string;
  tagline: string;
  email: string;
  phone: string;
  location: string;
  availabilityText: string;
  summary: string;
  skills: string[];
  projects: PdfProject[];
  certifications: string[];
  education: PdfEducation[];
  languages: PdfLanguage[];
}
