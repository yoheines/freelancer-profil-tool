import type { CompositionMode } from "./composition-mode.js";

export interface SectionPlan {
  name: string;
  mode: CompositionMode;
  evidenceRefs: string[];
  sourceItem?: string;
}
