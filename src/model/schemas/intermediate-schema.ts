/**
 * Zod schemas for the intermediate model.
 * Used to validate data before writing run artifacts.
 */

import { z } from "zod";

// ── Requirement ────────────────────────────────────────────

export const requirementSchema = z.object({
  id: z.string(),
  text: z.string(),
  source: z.enum(["explicit", "implicit"]),
  confidence: z.enum(["high", "medium", "low"]),
  category: z.string(),
});

export type RequirementType = z.infer<typeof requirementSchema>;

// ── PriorityEntry ─────────────────────────────────────────

export const priorityEntrySchema = z.object({
  requirementId: z.string(),
  priority: z.number(),
  rationale: z.string(),
});

export type PriorityEntryType = z.infer<typeof priorityEntrySchema>;

// ── AmbiguityNote ─────────────────────────────────────────

export const ambiguityNoteSchema = z.object({
  requirementId: z.string(),
  issue: z.string(),
});

export type AmbiguityNoteType = z.infer<typeof ambiguityNoteSchema>;

// ── RequirementAnalysis ───────────────────────────────────

export const requirementAnalysisSchema = z.object({
  explicitRequirements: z.array(requirementSchema),
  implicitSignals: z.array(requirementSchema),
  priorities: z.array(priorityEntrySchema),
  ambiguities: z.array(ambiguityNoteSchema),
  positioningHeadline: z.string(),
});

export type RequirementAnalysisType = z.infer<typeof requirementAnalysisSchema>;

// ── EvidenceItem ──────────────────────────────────────────

export const evidenceItemSchema = z.object({
  id: z.string(),
  sourceItem: z.string(),
  sourceType: z.enum(["profile", "project-history"]),
  linkedRequirements: z.array(z.string()),
  relevanceScore: z.number(),
  confidence: z.enum(["firm", "context", "assumption"]),
  excerpt: z.string(),
});

export type EvidenceItemType = z.infer<typeof evidenceItemSchema>;

// ── UnsupportedRequirement ─────────────────────────────────

export const unsupportedRequirementSchema = z.object({
  requirementId: z.string(),
  reason: z.string(),
});

export type UnsupportedRequirementType = z.infer<typeof unsupportedRequirementSchema>;

// ── SelectedEvidenceSet ───────────────────────────────────

export const selectedEvidenceSetSchema = z.object({
  selectedEvidence: z.array(evidenceItemSchema),
  unsupportedRequirements: z.array(unsupportedRequirementSchema),
});

export type SelectedEvidenceSetType = z.infer<typeof selectedEvidenceSetSchema>;

// ── SectionPlan ───────────────────────────────────────────

export const sectionPlanSchema = z.object({
  name: z.string(),
  mode: z.enum(["static", "adapted", "generated"]),
  evidenceRefs: z.array(z.string()),
  sourceItem: z.string().optional(),
});

export type SectionPlanType = z.infer<typeof sectionPlanSchema>;

// ── ProfileCompositionDecision ────────────────────────────

export const profileCompositionDecisionSchema = z.object({
  headline: z.string(),
  sections: z.array(sectionPlanSchema),
});

export type ProfileCompositionDecisionType = z.infer<typeof profileCompositionDecisionSchema>;

// ── PriorityAdjustmentEntry ───────────────────────────────

export const priorityAdjustmentEntrySchema = z.object({
  requirementId: z.string(),
  originalPriority: z.number(),
  adjustedPriority: z.number(),
  rationale: z.string(),
});

export type PriorityAdjustmentEntryType = z.infer<typeof priorityAdjustmentEntrySchema>;

// ── Intermediate Model Inputs ─────────────────────────────

export const intermediateInputsSchema = z.object({
  postingPath: z.string(),
  sourcePaths: z.array(z.string()),
  steeringHints: z.array(z.string()),
  targetLanguage: z.string().optional(),
});

export type IntermediateInputsType = z.infer<typeof intermediateInputsSchema>;

// ── Full Intermediate Model ───────────────────────────────

/**
 * Schema for the entire intermediate model that gets serialized to YAML.
 * Mirrors the shape written by writeIntermediateModel().
 */
export const intermediateModelSchema = z.object({
  runMetadata: z.object({
    runId: z.string(),
    createdAt: z.string(),
  }),
  inputs: intermediateInputsSchema,
  requirementAnalysis: requirementAnalysisSchema.optional(),
  evidenceSelection: selectedEvidenceSetSchema.optional(),
  compositionPlan: profileCompositionDecisionSchema,
  priorityAdjustment: z.array(priorityAdjustmentEntrySchema).optional(),
  requirementsMap: z.array(z.object({
    requirement: z.string(),
    priority: z.enum(["hoch", "mittel", "niedrig"]),
    coverage: z.enum(["gut_belegt", "schwach_gestuetzt", "unbelegt"]),
    evidenceType: z.enum(["projekt", "zertifikat", "profil_skill", "rolle", "indirekt", "keine"]),
    keyEvidence: z.string(),
    reasoning: z.string().optional(),
    suggestedEvidence: z.string().optional(),
    suggestedSourceLocation: z.enum([
      "summary",
      "skills",
      "certifications",
      "languages",
      "projektbeschreibung",
      "workExperience",
      "availability",
      "capacity",
      "onsiteWillingness",
      "sonstiges",
    ]).optional(),
    gapPriority: z.enum(["hoch", "mittel", "niedrig"]).optional(),
  })).optional(),
  skillKeywords: z.array(z.string()).optional(),
  projectRankings: z.array(z.object({
    rank: z.number(),
    id: z.string(),
    title: z.string(),
    rationale: z.string(),
  })).optional(),
});

export type IntermediateModelType = z.infer<typeof intermediateModelSchema>;
