-- ─── Meet participant visibility ──────────────────────────────────────────────
-- A listener can join a meet either privately or publicly. When public, the
-- meet is surfaced on their profile's now-playing (with a "Join" affordance for
-- viewers); when private, their profile shows the ordinary solo now-playing so
-- nobody can tell they're in a meet.
ALTER TABLE meet_participants
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Lets profile viewers efficiently find a user's active *public* meet.
CREATE INDEX IF NOT EXISTS meet_participants_user_public_idx
  ON meet_participants(user_id, is_active, is_public);
