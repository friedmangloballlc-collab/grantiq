/**
 * Registry of deferred questions — asked contextually when a user views
 * a grant that requires info they haven't provided yet.
 */

export interface DeferredQuestionDef {
  fieldId: string;
  prompt: string;
  helpText: string;
  type: "single_select" | "text";
  options?: { label: string; value: string | number | null }[];
  placeholder?: string;
  targetTable: string;
  targetColumn: string;
  /** Returns true if this question should be shown for the given grant + org */
  triggerWhen: (
    grant: Record<string, unknown>,
    org: Record<string, unknown>
  ) => boolean;
}

export const DEFERRED_QUESTIONS: Record<string, DeferredQuestionDef> = {
  technology_readiness_level: {
    fieldId: "technology_readiness_level",
    prompt: "Quick question to verify this grant is a fit: what's your technology readiness level?",
    helpText: "TRL 1-3: research / concept. TRL 4-6: prototype / testing. TRL 7-9: commercial ready.",
    type: "single_select",
    options: [
      { label: "TRL 1-3 (Basic research / concept)", value: "2" },
      { label: "TRL 4-6 (Prototype / testing)", value: "5" },
      { label: "TRL 7-9 (Commercial ready)", value: "8" },
      { label: "Not a technology project", value: null },
    ],
    targetTable: "org_profiles",
    targetColumn: "technology_readiness_level",
    triggerWhen: (grant, org) =>
      grant.required_trl_min != null && org.technology_readiness_level == null,
  },
};

/**
 * Check which deferred questions should be shown for a grant + org combination.
 * Returns an array of question definitions that need answering.
 */
export function getDeferredQuestionsForGrant(
  grant: Record<string, unknown>,
  org: Record<string, unknown>
): DeferredQuestionDef[] {
  return Object.values(DEFERRED_QUESTIONS).filter((q) =>
    q.triggerWhen(grant, org)
  );
}
