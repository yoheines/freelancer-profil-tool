import { describe, expect, it } from "vitest";
import { normalizeSkillNames, serializeProjectSkillsForPrompt } from "./normalize-skill-names.js";

describe("normalizeSkillNames", () => {
  it("should extract names from string and object-based skills", () => {
    expect(normalizeSkillNames([
      "CRM",
      { name: "SAP IS-U", context: "Operative Nutzung im Tagesgeschaeft." },
      { name: "", context: "leer" },
    ])).toEqual(["CRM", "SAP IS-U"]);
  });
});

describe("serializeProjectSkillsForPrompt", () => {
  it("should preserve project skill context for prompt serialization", () => {
    expect(serializeProjectSkillsForPrompt([
      "CRM",
      {
        name: "SAP IS-U",
        context: "Operative Nutzung im Tagesgeschaeft; relevante Systemkenntnis ohne Gesamtverantwortung.",
      },
    ])).toEqual([
      { name: "CRM" },
      {
        name: "SAP IS-U",
        context: "Operative Nutzung im Tagesgeschaeft; relevante Systemkenntnis ohne Gesamtverantwortung.",
      },
    ]);
  });
});
