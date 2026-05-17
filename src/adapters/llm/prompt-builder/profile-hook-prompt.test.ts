import { describe, expect, it } from "vitest";
import { buildProfileHookPrompt } from "./profile-hook-prompt.js";

describe("buildProfileHookPrompt", () => {
  it("should include claim-calibration guidance", () => {
    const { systemPrompt } = buildProfileHookPrompt(
      "Ausschreibung",
      [],
      "{}",
      "Deutsch",
      {
        entries: [
          {
            requirement: "Change-Management",
            priority: "hoch",
            coverage: "schwach_gestuetzt",
            evidenceType: "indirekt",
            keyEvidence: "Projekt X",
          },
        ],
      },
    );

    // Shared Evidenz-Strategie (zentral definiert)
    expect(systemPrompt).toContain("Evidenz-Strategie");
    expect(systemPrompt).toContain("Claim-Kalibrierung");
    expect(systemPrompt).toContain("Allgemeine Strategie-Matrix");
    // Hookspezifische Formulierungshilfen
    expect(systemPrompt).toContain("Zu stark bei nur indirekter Evidenz");
    // Requirements-Map
    expect(systemPrompt).toContain("Change-Management");
    expect(systemPrompt).toContain("evidenceType=indirekt");
  });
});
