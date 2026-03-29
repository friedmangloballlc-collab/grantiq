CREATE TABLE crawl_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_name TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('api', 'rss', 'scrape', 'spreadsheet', 'manual')),
  base_url TEXT,
  config JSONB DEFAULT '{}',
  crawl_frequency_hours INTEGER DEFAULT 24,
  last_crawled_at TIMESTAMPTZ,
  last_success_at TIMESTAMPTZ,
  consecutive_failures INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  grants_discovered_total INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE raw_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crawl_source_id UUID NOT NULL REFERENCES crawl_sources(id),
  external_id TEXT,
  raw_payload JSONB NOT NULL DEFAULT '{}',
  ingested_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  processed BOOLEAN DEFAULT false,
  processing_error TEXT,
  grant_source_id UUID REFERENCES grant_sources(id)
);

CREATE TABLE crawl_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID NOT NULL REFERENCES crawl_sources(id),
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  grants_found INTEGER DEFAULT 0,
  grants_new INTEGER DEFAULT 0,
  grants_updated INTEGER DEFAULT 0,
  grants_expired INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE embedding_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('grant', 'org_profile', 'funder', 'search_query')),
  entity_id UUID NOT NULL,
  model_version TEXT NOT NULL,
  embedding vector(1536),
  status TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  completed_at TIMESTAMPTZ
);
