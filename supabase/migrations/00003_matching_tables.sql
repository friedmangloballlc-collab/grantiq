CREATE TABLE grant_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  grant_source_id UUID NOT NULL REFERENCES grant_sources(id) ON DELETE CASCADE,
  match_score REAL NOT NULL DEFAULT 0,
  score_breakdown JSONB DEFAULT '{}',
  match_reasons JSONB DEFAULT '{}',
  missing_requirements TEXT[] DEFAULT '{}',
  win_probability TEXT CHECK (win_probability IN ('low', 'moderate', 'high', 'very_high')),
  difficulty_rating TEXT CHECK (difficulty_rating IN ('easy', 'moderate', 'hard', 'very_hard')),
  recommended_quarter TEXT,
  model_version TEXT,
  embedding_similarity REAL,
  last_computed TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE grant_match_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES grant_matches(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  action TEXT NOT NULL CHECK (action IN ('saved', 'dismissed', 'applied', 'irrelevant', 'too_competitive', 'wrong_category')),
  reason_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE funding_roadmaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  quarter TEXT NOT NULL,
  year INTEGER NOT NULL,
  recommended_grants JSONB DEFAULT '[]',
  strategy_notes TEXT,
  total_potential_amount NUMERIC DEFAULT 0,
  capacity_notes TEXT,
  risk_assessment TEXT,
  generated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE readiness_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  criteria JSONB NOT NULL DEFAULT '{}',
  overall_score REAL NOT NULL DEFAULT 0,
  gaps TEXT[] DEFAULT '{}',
  recommendations TEXT[] DEFAULT '{}',
  scored_at TIMESTAMPTZ DEFAULT now() NOT NULL
);
