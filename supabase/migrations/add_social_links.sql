-- Stores per-platform social account URLs for a user's profile.
-- Shape: { instagram: "https://...", x: "https://...", tiktok: "...", youtube: "...", soundcloud: "...", facebook: "..." }
-- Keys are the platform identifiers; only present keys are linked.
ALTER TABLE users ADD COLUMN IF NOT EXISTS social_links jsonb DEFAULT '{}'::jsonb;
