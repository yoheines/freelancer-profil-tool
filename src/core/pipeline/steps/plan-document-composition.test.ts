import { describe, it, expect } from "vitest";
import { planDocumentComposition } from "./plan-document-composition.js";
import type { SourceDocument } from "../../../model/input/job-posting-input.js";

function makeSources(overrides?: SourceDocument[]): SourceDocument[] {
  return overrides ?? [
    {
      type: "profile",
      path: "/tmp/profile.yaml",
      content: {
        skills: [{ name: "TypeScript" }],
        certifications: ["AWS Solutions Architect"],
      },
    },
    {
      type: "project-history",
      path: "/tmp/projects.yaml",
      content: {
        projects: [
          { id: "proj-1", title: "Project X", description: "Backend" },
        ],
      },
    },
  ];
}

describe("planDocumentComposition", () => {
  it("should return the expected 4 sections", () => {
    const result = planDocumentComposition("Senior Product Owner Website", makeSources());

    expect(result.sections).toHaveLength(4);
    expect(result.sections.map((s) => s.name)).toEqual([
      "Einleitung",
      "Projekterfahrung",
      "Qualifikationen",
      "Kontaktdaten",
    ]);
  });

  it("should derive the headline from the first posting line", () => {
    const result = planDocumentComposition(
      "Projektanfrage: Senior Product Owner Website (m/w/d) - Plattformsteuerung\n\nWeitere Details",
      makeSources(),
    );

    expect(result.headline).toBe("Senior Product Owner Website");
  });

  it("should set project and qualification sections to adapted when source data exists", () => {
    const result = planDocumentComposition("Senior Product Owner Website", makeSources());

    expect(result.sections.find((s) => s.name === "Projekterfahrung")?.mode).toBe("adapted");
    expect(result.sections.find((s) => s.name === "Qualifikationen")?.mode).toBe("adapted");
  });
});
