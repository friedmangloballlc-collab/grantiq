CREATE TABLE user_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'view_grant', 'click_apply', 'download_rfp', 'bookmark',
    'share', 'search_query', 'filter_change'
  )),
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB DEFAULT '{}',
  session_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE search_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  query_text TEXT NOT NULL,
  embedding vector(1536),
  filters_applied JSONB DEFAULT '{}',
  results_count INTEGER DEFAULT 0,
  results_clicked UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  digest_frequency TEXT CHECK (digest_frequency IN ('daily', 'weekly', 'biweekly', 'off')) DEFAULT 'weekly',
  alert_new_matches_above_score REAL DEFAULT 80,
  alert_deadline_days_before INTEGER DEFAULT 14,
  alert_pipeline_stale_days INTEGER DEFAULT 7,
  preferred_channels TEXT[] DEFAULT '{email}',
  quiet_hours JSONB DEFAULT '{}'
);

CREATE TABLE notifications_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'digest', 'deadline_alert', 'new_match', 'pipeline_reminder', 'outcome_request'
  )),
  channel TEXT NOT NULL,
  content_snapshot JSONB DEFAULT '{}',
  sent_at TIMESTAMPTZ DEFAULT now(),
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  grants_included UUID[] DEFAULT '{}'
);
