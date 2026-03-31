-- Migration: upgrade grant_pipeline from 6 stages to 8 stages
-- Adds: under_review, pending_decision
-- Renames (via data migration): researching→identified, preparing→qualified, writing→in_development

-- Step 1: Migrate legacy stage values to new names
UPDATE grant_pipeline SET stage = 'identified'    WHERE stage = 'researching';
UPDATE grant_pipeline SET stage = 'qualified'     WHERE stage = 'preparing';
UPDATE grant_pipeline SET stage = 'in_development' WHERE stage = 'writing';

-- Step 2: Drop the old CHECK constraint (if it exists)
ALTER TABLE grant_pipeline DROP CONSTRAINT IF EXISTS grant_pipeline_stage_check;

-- Step 3: Add the new 8-stage CHECK constraint
ALTER TABLE grant_pipeline ADD CONSTRAINT grant_pipeline_stage_check
  CHECK (stage IN (
    'identified',
    'qualified',
    'in_development',
    'under_review',
    'submitted',
    'pending_decision',
    'awarded',
    'declined'
  ));
