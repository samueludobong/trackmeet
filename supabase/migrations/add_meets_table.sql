-- ─── Meets (live listening sessions hosted by a user) ───────────────────────

CREATE TABLE IF NOT EXISTS meets (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id          uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name             text        NOT NULL,
  description      text,
  tags             text[]      NOT NULL DEFAULT '{}',
  allow_comments   boolean     NOT NULL DEFAULT true,
  allow_reactions  boolean     NOT NULL DEFAULT true,
  is_live          boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  ended_at         timestamptz
);

CREATE INDEX IF NOT EXISTS meets_host_id_idx  ON meets(host_id);
CREATE INDEX IF NOT EXISTS meets_is_live_idx  ON meets(is_live, created_at DESC);

ALTER TABLE meets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read meets"
  ON meets FOR SELECT TO authenticated USING (true);

CREATE POLICY "Host can insert own meets"
  ON meets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Host can update own meets"
  ON meets FOR UPDATE TO authenticated
  USING (auth.uid() = host_id);

CREATE POLICY "Host can delete own meets"
  ON meets FOR DELETE TO authenticated
  USING (auth.uid() = host_id);
