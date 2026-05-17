import type { CompositionMode } from "../composition/composition-mode.js";

export interface DraftSection {
  name: string;
  content: string;
  compositionMode: CompositionMode;
  evidenceRefs: string[];
  sourceItem?: string;
}

export interface ProfileDraft {
  sections: DraftSection[];
  content: string; // Full rendered Markdown
}
