ALTER TABLE crawl_sources ADD CONSTRAINT crawl_sources_source_name_unique UNIQUE (source_name);

DO $$
BEGIN
  INSERT INTO crawl_sources (source_name, source_type, base_url, config, crawl_frequency_hours, is_active, grants_discovered_total, consecutive_failures)
  VALUES
    (
      'Grants.gov — Posted Opportunities',
      'api',
      'https://apply07.grants.gov/grantsws/rest/opportunities/search',
      '{"api": "grants_gov", "status": "posted"}',
      24,
      true,
      0,
      0
    ),
    (
      'SAM.gov — Active Opportunities',
      'api',
      'https://api.sam.gov/opportunities/v2/search',
      '{"api": "sam_gov", "ptype": "o"}',
      24,
      true,
      0,
      0
    )
  ON CONFLICT (source_name) DO NOTHING;
END $$;
