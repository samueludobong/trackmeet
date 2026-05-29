-- ─── Meet system: live track state, participants, tracklist, chat ─────────────
-- Extends the base meets table (see add_meets_table.sql) with the columns and
-- side tables needed for synced listening rooms.

-- ── Live playback state on the meet itself ───────────────────────────────────
-- The host writes the currently-playing track + position here every poll so
-- listeners can read it and match their own Spotify playback.
ALTER TABLE meets ADD COLUMN IF NOT EXISTS current_track_id          text;
ALTER TABLE meets ADD COLUMN IF NOT EXISTS current_track_name        text;
ALTER TABLE meets ADD COLUMN IF NOT EXISTS current_track_artist      text;
ALTER TABLE meets ADD COLUMN IF NOT EXISTS current_track_album_art   text;
ALTER TABLE meets ADD COLUMN IF NOT EXISTS current_track_duration_ms integer;
ALTER TABLE meets ADD COLUMN IF NOT EXISTS current_track_position_ms integer;
ALTER TABLE meets ADD COLUMN IF NOT EXISTS current_track_is_playing  boolean NOT NULL DEFAULT true;
ALTER TABLE meets ADD COLUMN IF NOT EXISTS position_updated_at       timestamptz;
-- talk_mode = host is talking; listeners pause their music while true.
ALTER TABLE meets ADD COLUMN IF NOT EXISTS talk_mode                 boolean NOT NULL DEFAULT false;
-- show_on_profile = host chose to surface this (ended) meet's tracklist on their profile.
ALTER TABLE meets ADD COLUMN IF NOT EXISTS show_on_profile           boolean NOT NULL DEFAULT false;

-- ── Participants (drives live listener count) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS meet_participants (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  meet_id    uuid        NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  is_active  boolean     NOT NULL DEFAULT true,
  joined_at  timestamptz NOT NULL DEFAULT now(),
  left_at    timestamptz,
  UNIQUE (meet_id, user_id)
);

CREATE INDEX IF NOT EXISTS meet_participants_meet_idx
  ON meet_participants(meet_id, is_active);

ALTER TABLE meet_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read participants"
  ON meet_participants FOR SELECT TO authenticated USING (true);

CREATE POLICY "User manages own participation insert"
  ON meet_participants FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "User manages own participation update"
  ON meet_participants FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "User manages own participation delete"
  ON meet_participants FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- ── Tracklist (what was played; powers the end-of-meet summary + save) ────────
CREATE TABLE IF NOT EXISTS meet_tracks (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  meet_id    uuid        NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
  track_id   text        NOT NULL,
  name       text        NOT NULL,
  artist     text,
  album_art  text,
  played_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meet_tracks_meet_idx ON meet_tracks(meet_id, played_at);

ALTER TABLE meet_tracks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read meet tracks"
  ON meet_tracks FOR SELECT TO authenticated USING (true);

-- Only the meet host can append to the tracklist.
CREATE POLICY "Host appends meet tracks"
  ON meet_tracks FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM meets m WHERE m.id = meet_id AND m.host_id = auth.uid())
  );

-- ── Live chat ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS meet_messages (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  meet_id    uuid        NOT NULL REFERENCES meets(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meet_messages_meet_idx ON meet_messages(meet_id, created_at);

ALTER TABLE meet_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read meet messages"
  ON meet_messages FOR SELECT TO authenticated USING (true);

CREATE POLICY "User sends own meet messages"
  ON meet_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- ── Realtime ──────────────────────────────────────────────────────────────────
-- Add tables to the realtime publication so the client receives live changes.
-- Wrapped in DO blocks so re-running the migration doesn't error on duplicates.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'meet_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE meet_messages;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'meet_participants'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE meet_participants;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'meets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE meets;
  END IF;
END $$;
