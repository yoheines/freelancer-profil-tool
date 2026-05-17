export type SupportedProfileLanguage = "de" | "en";

export interface DraftTranslations {
  profileTitle: string;
  sectionTitles: Record<string, string>;
  placeholders: {
    noProfileData: (sectionName: string) => string;
    noProjectData: string;
    staticContent: (sectionName: string) => string;
    notGenerated: (sectionName: string) => string;
  };
  metadataLabels: {
    client: string;
    industry: string;
    period: string;
    available: string;
    capacity: string;
    onsite: string;
  };
  qualificationTitles: {
    coreCompetencies: string;
    certifications: string;
    languages: string;
    education: string;
    careerStations: string;
  };
}

export function normalizeProfileLanguage(language?: string): SupportedProfileLanguage {
  switch ((language ?? "de").trim().toLowerCase()) {
    case "en":
    case "eng":
    case "english":
    case "englisch":
      return "en";
    default:
      return "de";
  }
}

export function getProfileLanguageLabel(language?: string): string {
  return normalizeProfileLanguage(language) === "en" ? "English" : "Deutsch";
}

export function getDraftTranslations(language?: string): DraftTranslations {
  if (normalizeProfileLanguage(language) === "en") {
    return {
      profileTitle: "Freelancer Profile",
      sectionTitles: {
        Einleitung: "Introduction",
        Projekterfahrung: "Project Experience",
        Qualifikationen: "Qualifications",
        Kontaktdaten: "Contact Details",
      },
      placeholders: {
        noProfileData: (sectionName) => `[${translateSectionName(sectionName, "en")} - no profile data available]`,
        noProjectData: "[Project Experience - no project data available]",
        staticContent: (sectionName) => `[${translateSectionName(sectionName, "en")} - static content]`,
        notGenerated: (sectionName) => `[${translateSectionName(sectionName, "en")} - not generated yet]`,
      },
      metadataLabels: {
        client: "Client",
        industry: "Industry",
        period: "Period",
        available: "Available",
        capacity: "Capacity",
        onsite: "Onsite",
      },
      qualificationTitles: {
        coreCompetencies: "Core Competencies",
        certifications: "Certifications",
        languages: "Languages",
        education: "Education",
        careerStations: "Career History",
      },
    };
  }

  return {
    profileTitle: "Freelancer-Profil",
    sectionTitles: {
      Einleitung: "Einleitung",
      Projekterfahrung: "Projekterfahrung",
      Qualifikationen: "Qualifikationen",
      Kontaktdaten: "Kontaktdaten",
    },
    placeholders: {
      noProfileData: (sectionName) => `[${sectionName} — keine Profildaten hinterlegt]`,
      noProjectData: "[Projekterfahrung — keine Projektdaten hinterlegt]",
      staticContent: (sectionName) => `[${sectionName} — static content]`,
      notGenerated: (sectionName) => `[${sectionName} — noch nicht generiert]`,
    },
    metadataLabels: {
      client: "Auftraggeber",
      industry: "Branche",
      period: "Zeitraum",
      available: "Verfügbar",
      capacity: "Auslastung",
      onsite: "Onsite",
    },
    qualificationTitles: {
      coreCompetencies: "Kernkompetenzen",
      certifications: "Zertifizierungen",
      languages: "Sprachen",
      education: "Ausbildung",
      careerStations: "Karrierestationen",
    },
  };
}

export function translateSectionName(sectionName: string, language?: string): string {
  return getDraftTranslations(language).sectionTitles[sectionName] ?? sectionName;
}
