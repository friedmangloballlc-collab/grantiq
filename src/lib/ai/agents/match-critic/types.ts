// grantiq/src/lib/ai/agents/match-critic/types.ts

export type KillReason =
  | 'geography'
  | 'org_size_too_big'
  | 'org_size_too_small'
  | 'entity_type'
  | 'mission_mismatch'
  | 'eligibility_hard_requirement'
  | 'other';

export interface CriticOrgProfile {
  name: string;
  entity_type: string | null;
  state: string | null;
  city: string | null;
  annual_budget: number | null;
  employee_count: number | null;
  population_served: string[];
  program_areas: string[];
  mission_statement: string | null;
}

export interface CriticGrantMatch {
  id: string;
  name: string;
  funder_name: string;
  source_type: string | null;
  category: string | null;
  amount_min: number | null;
  amount_max: number | null;
  eligibility_types: string[];
  states: string[];
  description: string | null;
}

export interface CriticVerdict {
  verdict: 'KEEP' | 'KILL';
  killReason: KillReason | null;
  confidence: number;
  notes: string;
  /** Which stage produced the verdict — useful for admin metrics */
  stage: 'hard_check' | 'llm' | 'fail_open';
}
