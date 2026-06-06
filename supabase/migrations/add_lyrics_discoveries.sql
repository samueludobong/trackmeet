-- Records the first-ever lookup ("discovery") of a song's lyrics. A dedicated
-- table (not a column on lyrics_cache) so the flag can never be reset by lyrics
-- cache writes. Claiming a discovery = inserting a row; the primary key makes it
-- atomic — exactly one inserter wins, everyone else hits a unique-violation.
CREATE TABLE IF NOT EXISTS lyrics_discoveries (
  spotify_track_id text        PRIMARY KEY,
  discovered_by    uuid        REFERENCES users(id) ON DELETE SET NULL,
  discovered_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE lyrics_discoveries ENABLE ROW LEVEL SECURITY;

-- Anyone may read (to check discovery state).
CREATE POLICY "Public read lyrics_discoveries"
  ON lyrics_discoveries FOR SELECT
  USING (true);

-- Any signed-in user may claim a discovery.
CREATE POLICY "Authenticated insert lyrics_discoveries"
  ON lyrics_discoveries FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
