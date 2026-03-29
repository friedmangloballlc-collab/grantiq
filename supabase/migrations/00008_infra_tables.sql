CREATE TABLE job_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'dead')),
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  locked_by TEXT,
  locked_at TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE match_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  org_profile_hash TEXT NOT NULL,
  grant_id UUID NOT NULL REFERENCES grant_sources(id) ON DELETE CASCADE,
  match_score REAL NOT NULL,
  match_reasoning TEXT,
  vector_similarity REAL,
  ai_score REAL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(org_id, grant_id, org_profile_hash)
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
  user_id UUID,
  org_id UUID,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  severity TEXT NOT NULL DEFAULT 'INFO' CHECK (severity IN ('INFO', 'MEDIUM', 'HIGH', 'CRITICAL')),
  metadata JSONB DEFAULT '{}',
  ip_address INET
);

CREATE TABLE processed_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Postgres function for safe job polling with SKIP LOCKED
CREATE OR REPLACE FUNCTION poll_next_job(p_worker_id TEXT)
RETURNS SETOF job_queue
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  UPDATE job_queue
  SET status = 'processing',
      locked_by = p_worker_id,
      locked_at = NOW(),
      attempts = attempts + 1
  WHERE id = (
    SELECT id FROM job_queue
    WHERE status = 'pending' AND scheduled_for <= NOW()
    ORDER BY priority DESC, scheduled_for ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  RETURNING *;
END;
$$;
