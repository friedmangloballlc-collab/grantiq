-- pgvector indexes (will be effective after data is loaded)
-- Note: IVFFlat requires training data. These will be recreated after seeding.
-- CREATE INDEX idx_grant_sources_embedding ON grant_sources
--   USING ivfflat (description_embedding vector_cosine_ops) WITH (lists = 100);

-- Standard indexes
CREATE INDEX idx_grant_sources_active ON grant_sources (is_active, status, deadline);
CREATE INDEX idx_grant_sources_type ON grant_sources (source_type);
CREATE INDEX idx_grant_sources_category ON grant_sources (category);

-- Job queue polling
CREATE INDEX idx_job_queue_poll ON job_queue (priority DESC, scheduled_for ASC)
  WHERE status = 'pending';
CREATE INDEX idx_job_queue_stale ON job_queue (locked_at)
  WHERE status = 'processing';

-- Match cache
CREATE INDEX idx_match_cache_org ON match_cache (org_id, org_profile_hash, match_score DESC);

-- Org members
CREATE INDEX idx_org_members_user ON org_members (user_id, status);
CREATE INDEX idx_org_members_org ON org_members (org_id, status);

-- Pipeline
CREATE INDEX idx_pipeline_org ON grant_pipeline (org_id, stage);

-- AI usage
CREATE INDEX idx_ai_usage_billing ON ai_usage (org_id, billing_period, action_type);

-- Audit logs
CREATE INDEX idx_audit_logs_org_time ON audit_logs (org_id, timestamp DESC);
CREATE INDEX idx_audit_logs_severity ON audit_logs (severity) WHERE severity IN ('HIGH', 'CRITICAL');

-- Subscriptions
CREATE INDEX idx_subscriptions_org ON subscriptions (org_id, status);

-- Crawl logs
CREATE INDEX idx_crawl_logs_source ON crawl_logs (source_id, created_at DESC);
