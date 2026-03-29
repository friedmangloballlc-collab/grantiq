ALTER TABLE grant_sources
  ADD CONSTRAINT grant_sources_name_funder_unique UNIQUE (name, funder_name);
