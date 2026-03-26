-- Add external_id to fixtures for deduplication against football-data.org match IDs
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS external_id text;

-- Drop old index if exists, add proper UNIQUE CONSTRAINT (required for PostgREST upsert)
DROP INDEX IF EXISTS fixtures_external_id_team_idx;
ALTER TABLE fixtures DROP CONSTRAINT IF EXISTS fixtures_external_id_team_unique;
ALTER TABLE fixtures ADD CONSTRAINT fixtures_external_id_team_unique UNIQUE (external_id, team_id);
