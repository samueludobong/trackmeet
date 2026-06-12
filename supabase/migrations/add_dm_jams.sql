-- ─── Private DM "Jams" ────────────────────────────────────────────────────────
-- A jam is a Meet scoped to a single DM conversation: hostless (either member
-- controls playback), private (never surfaced in discovery or as "in a meet"),
-- and minimisable/rejoinable like any meet. We extend the existing `meets`
-- table rather than adding a new one so all the live-track / participant /
-- realtime infrastructure is reused.

ALTER TABLE meets ADD COLUMN IF NOT EXISTS conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE;
ALTER TABLE meets ADD COLUMN IF NOT EXISTS is_personal     boolean NOT NULL DEFAULT false;
-- Whoever last took a playback action — the current "driver". The other member
-- follows their playback until they themselves act (auto driver-switch).
ALTER TABLE meets ADD COLUMN IF NOT EXISTS driver_id       uuid REFERENCES users(id);

-- Fast lookup of a conversation's live jam.
CREATE INDEX IF NOT EXISTS meets_conversation_idx ON meets(conversation_id) WHERE is_personal;

-- Either member of the conversation may write a personal jam's playback/driver
-- state (the base "Host can update own meets" policy only covers the creator).
DROP POLICY IF EXISTS "Conversation members update personal jam" ON meets;
CREATE POLICY "Conversation members update personal jam"
  ON meets FOR UPDATE TO authenticated
  USING (
    is_personal AND conversation_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = meets.conversation_id
        AND (c.user_a = auth.uid() OR c.user_b = auth.uid())
    )
  );
