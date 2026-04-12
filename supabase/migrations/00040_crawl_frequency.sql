-- Add crawl frequency to grant_source_directory so different sources
-- get checked at appropriate intervals
ALTER TABLE grant_source_directory ADD COLUMN IF NOT EXISTS crawl_frequency TEXT
  CHECK (crawl_frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'quarterly', 'manual'))
  DEFAULT 'weekly';

-- Update existing federal agencies to daily (they update most frequently)
UPDATE grant_source_directory SET crawl_frequency = 'daily' WHERE category = 'federal_agency';
UPDATE grant_source_directory SET crawl_frequency = 'daily' WHERE category = 'sbir_sttr';

-- Foundations update less frequently
UPDATE grant_source_directory SET crawl_frequency = 'monthly' WHERE category = 'national_foundation';
UPDATE grant_source_directory SET crawl_frequency = 'monthly' WHERE category = 'corporate_foundation';
UPDATE grant_source_directory SET crawl_frequency = 'monthly' WHERE category = 'community_foundation';

-- Competitions are seasonal
UPDATE grant_source_directory SET crawl_frequency = 'biweekly' WHERE category = 'competition';
UPDATE grant_source_directory SET crawl_frequency = 'biweekly' WHERE category = 'accelerator';
