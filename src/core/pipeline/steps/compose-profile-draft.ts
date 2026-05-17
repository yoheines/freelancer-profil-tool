/**
 * Assembles the final Markdown profile draft from individual sections.
 * This is purely deterministic — sections are concatenated in template order.
 */

import type { DraftSection, ProfileDraft } from "../../../model/draft/profile-draft.js";
import type { ProfileCompositionDecision } from "../../../model/composition/profile-composition-decision.js";
import { getDraftTranslations, translateSectionName } from "../../../shared/i18n/profile-language.js";

export function composeProfileDraft(
  sections: DraftSection[],
  composition: ProfileCompositionDecision,
  skillKeywords?: string[],
  targetLanguage?: string,
): ProfileDraft {
  const translations = getDraftTranslations(targetLanguage);
  // Sort sections according to the composition plan order
  const orderedSections = composition.sections
    .map((plan) => sections.find((s) => s.name === plan.name))
    .filter(Boolean) as DraftSection[];

  const content = orderedSections
    .map((section) => formatSection(section, targetLanguage))
    .join("\n\n---\n\n");

  // Keyword line unter der Headline, falls vorhanden
  const keywordLine = (skillKeywords && skillKeywords.length > 0)
    ? `${skillKeywords.join(" · ")}\n\n`
    : "";

  return {
    sections: orderedSections,
    content: `# ${translations.profileTitle}\n\n${composition.headline}\n\n${keywordLine}---\n\n${content}`,
  };
}

function formatSection(section: DraftSection, targetLanguage?: string): string {
  const translations = getDraftTranslations(targetLanguage);
  return `## ${translateSectionName(section.name, targetLanguage)}\n\n${section.content || translations.placeholders.notGenerated(section.name)}`;
}
