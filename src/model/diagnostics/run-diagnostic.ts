export interface StepTiming {
  name: string;
  durationMs: number;
  status: "ok" | "warning" | "error";
  warnings?: string[];
}

export interface StructuralWeakness {
  type: "unsupported_requirement" | "unmatched_source" | "weak_evidence" | "schwach_gestuetzte_anforderung";
  requirement?: string;
  requirementId?: string;
  sourceItem?: string;
  severity: "warning" | "info";
  message: string;
}

export interface LlmUsage {
  totalTokens: number;
  calls: number;
}

export interface RefinementSuggestion {
  requirementId: string;
  type: "add_source_data" | "expand_project" | "provide_context";
  message: string;
}

export interface RunDiagnostic {
  totalDurationMs: number;
  steps: StepTiming[];
  structuralWeaknesses: StructuralWeakness[];
  ambiguities?: Array<{ requirementId: string; issue: string }>;
  refinementSuggestions?: RefinementSuggestion[];
  compositionSummary: {
    totalSections: number;
    staticCount: number;
    adaptedCount: number;
    generatedCount: number;
  };
  llmUsage: LlmUsage;
  outputRefs: {
    draftPath: string;
    intermediatePath: string;
    diagnosticsPath: string;
    gapAnalysisPath?: string;
  };
}
