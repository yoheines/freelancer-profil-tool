import { describe, it, expect } from "vitest";
import { composeProfileDraft } from "./compose-profile-draft.js";
import type { DraftSection } from "../../../model/draft/profile-draft.js";
import type { ProfileCompositionDecision } from "../../../model/composition/profile-composition-decision.js";

describe("composeProfileDraft", () => {
  const makeSections = (): DraftSection[] => [
    {
      name: "Einleitung",
      content: "Erfahrener Softwareentwickler mit Fokus auf Backend.",
      compositionMode: "generated",
      evidenceRefs: ["ev-1"],
    },
    {
      name: "Projekterfahrung",
      content: "5 Jahre bei ACME Corp als Backend-Engineer.",
      compositionMode: "adapted",
      evidenceRefs: ["ev-2"],
    },
    {
      name: "Qualifikationen",
      content: "TypeScript, Node.js, PostgreSQL",
      compositionMode: "adapted",
      evidenceRefs: ["ev-3"],
    },
    {
      name: "Kontaktdaten",
      content: "Max Mustermann, max@example.com",
      compositionMode: "static",
      evidenceRefs: [],
    },
  ];

  const makeComposition = (overrides?: Partial<ProfileCompositionDecision>): ProfileCompositionDecision => ({
    headline: "Senior Backend Engineer",
    sections: [
      { name: "Einleitung", mode: "generated", evidenceRefs: ["ev-1"] },
      { name: "Projekterfahrung", mode: "adapted", evidenceRefs: ["ev-2"] },
      { name: "Qualifikationen", mode: "adapted", evidenceRefs: ["ev-3"] },
      { name: "Kontaktdaten", mode: "static", evidenceRefs: [] },
    ],
    ...overrides,
  });

  it("should compose sections joined with --- separators", () => {
    const sections = makeSections();
    const composition = makeComposition();

    const result = composeProfileDraft(sections, composition);

    // Verify sections are in order
    expect(result.sections.map((s) => s.name)).toEqual([
      "Einleitung",
      "Projekterfahrung",
      "Qualifikationen",
      "Kontaktdaten",
    ]);

    // Verify content contains section headers
    expect(result.content).toContain("## Einleitung");
    expect(result.content).toContain("## Projekterfahrung");
    expect(result.content).toContain("## Qualifikationen");
    expect(result.content).toContain("## Kontaktdaten");

    // Verify --- separators exist between sections
    const separatorCount = (result.content.match(/---/g) || []).length;
    expect(separatorCount).toBeGreaterThanOrEqual(4); // one after keyword line + 3 between 4 sections
  });

  it("should render skillKeywords after headline", () => {
    const sections = makeSections();
    const composition = makeComposition();

    const result = composeProfileDraft(sections, composition, ["TypeScript", "Node.js", "React"]);

    expect(result.content).toContain("TypeScript · Node.js · React");
    // Keyword line should be right after the headline
    expect(result.content).toMatch(/Senior Backend Engineer\n\nTypeScript · Node\.js · React/);
  });

  it("should not include keyword line when skillKeywords is empty", () => {
    const sections = makeSections();
    const composition = makeComposition();

    const result = composeProfileDraft(sections, composition, []);

    // No keyword line
    expect(result.content).toMatch(/Senior Backend Engineer\n\n---/);
    expect(result.content).not.toContain("·");
  });

  it("should not include keyword line when skillKeywords is undefined", () => {
    const sections = makeSections();
    const composition = makeComposition();

    const result = composeProfileDraft(sections, composition);

    expect(result.content).toMatch(/Senior Backend Engineer\n\n---/);
  });

  it("should format static sections correctly", () => {
    const sections = makeSections();
    const composition = makeComposition();

    const result = composeProfileDraft(sections, composition);

    const kontaktdatenSection = result.sections.find((s) => s.name === "Kontaktdaten");
    expect(kontaktdatenSection).toBeDefined();
    expect(kontaktdatenSection!.compositionMode).toBe("static");
    expect(result.content).toContain("Max Mustermann, max@example.com");
  });

  it("should match section ordering from composition plan", () => {
    const sections = makeSections();
    const composition = makeComposition({
      sections: [
        { name: "Kontaktdaten", mode: "static", evidenceRefs: [] },
        { name: "Einleitung", mode: "generated", evidenceRefs: ["ev-1"] },
        { name: "Qualifikationen", mode: "adapted", evidenceRefs: ["ev-3"] },
        { name: "Projekterfahrung", mode: "adapted", evidenceRefs: ["ev-2"] },
      ],
    });

    const result = composeProfileDraft(sections, composition);

    expect(result.sections.map((s) => s.name)).toEqual([
      "Kontaktdaten",
      "Einleitung",
      "Qualifikationen",
      "Projekterfahrung",
    ]);
  });

  it("should produce the full markdown content with headline and sections", () => {
    const sections = makeSections();
    const composition = makeComposition();

    const result = composeProfileDraft(sections, composition, ["Node.js"]);

    expect(result.content).toContain("# Freelancer-Profil");
    expect(result.content).toContain("Senior Backend Engineer");
    expect(result.content).toContain("Node.js");
    expect(result.content).toContain("## Einleitung");
    expect(result.content).toContain("## Projekterfahrung");
    expect(result.content).toContain("## Qualifikationen");
    expect(result.content).toContain("## Kontaktdaten");
  });

  it("should not render a warning banner without a dedicated evidence step", () => {
    const sections = makeSections();
    const composition = makeComposition();

    const result = composeProfileDraft(sections, composition);

    expect(result.content).not.toContain("in den vorhandenen Quellen belegt werden");
  });
});
