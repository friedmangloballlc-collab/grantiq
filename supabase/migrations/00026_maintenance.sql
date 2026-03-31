-- Auto-vacuum settings for high-write tables
ALTER TABLE job_queue SET (autovacuum_vacuum_scale_factor = 0.01);
ALTER TABLE user_events SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE notifications_log SET (autovacuum_vacuum_scale_factor = 0.05);

-- Partial indexes for common queries
CREATE INDEX IF NOT EXISTS idx_job_queue_pending
  ON job_queue (priority DESC, scheduled_for ASC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_pipeline_active
  ON grant_pipeline (org_id, stage)
  WHERE stage NOT IN ('awarded', 'declined');

CREATE INDEX IF NOT EXISTS idx_matches_org_score
  ON grant_matches (org_id, match_score DESC);
