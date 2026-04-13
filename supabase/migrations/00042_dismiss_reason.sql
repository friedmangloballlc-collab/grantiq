-- Add dismiss_reason to match_feedback for learning why users reject matches
ALTER TABLE match_feedback ADD COLUMN IF NOT EXISTS dismiss_reason TEXT;
