-- Migration 00052: Add Anthropic + observability columns to ai_generations
--
-- Unit 4 of the LLMGateway extension plan adds Anthropic support to aiCall
-- with prompt caching. Three new nullable columns capture the additional
-- observability signal:
--
--   - prompt_id          TEXT  — required on Anthropic calls; observability tag
--                                for ad-hoc SQL aggregation (e.g., cache hit
--                                rate per prompt). Null on legacy OpenAI calls
--                                until they opt in.
--   - cache_creation_tokens INT — Anthropic-only. Tokens billed at 1.25x or 2.0x
--                                input rate when written to the prompt cache.
--                                Null on OpenAI calls.
--   - cache_read_tokens     INT — Anthropic-only. Tokens billed at 0.1x input
--                                rate when read from the prompt cache. Null on
--                                OpenAI calls. (cache_read_tokens / tokens_input)
--                                is the per-call cache hit rate.
--
-- All three columns are NULLABLE — backwards compatible with existing OpenAI
-- inserts that don't supply them. ALTER TABLE ADD COLUMN IF NOT EXISTS makes
-- the migration re-runnable.

ALTER TABLE ai_generations ADD COLUMN IF NOT EXISTS prompt_id TEXT;
ALTER TABLE ai_generations ADD COLUMN IF NOT EXISTS cache_creation_tokens INT;
ALTER TABLE ai_generations ADD COLUMN IF NOT EXISTS cache_read_tokens INT;
