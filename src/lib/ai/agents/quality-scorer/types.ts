// grantiq/src/lib/ai/agents/quality-scorer/types.ts

export type Verdict = "submittable" | "needs_work" | "not_ready";
export type RubricSource = "explicit_from_rfp" | "inferred";

export interface RubricCriterion {
  criterion: string;
  max_points: number;
  description: string;
}

export interface Rubric {
  criteria: RubricCriterion[];
  total_points: number;
  source: RubricSource;
}

export interface Improvement {
  text: string;
  point_impact: number;
  section_name?: string;
}

export interface CriterionScore {
  criterion: string;
  max: number;
  score: number;
  evidence_quoted: string;
  strengths: string[];
  gaps: string[];
  improvements: Improvement[];
}

export interface ScoreResult {
  totalScore: number;
  maxPossible: number;
  criteriaDetail: CriterionScore[];
  improvementsRanked: Improvement[];
  verdict: Verdict;
  rubricSource: RubricSource;
  tokensUsed: { input: number; output: number };
}
