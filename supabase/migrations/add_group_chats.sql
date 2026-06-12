-- Group chats: multi-user conversations with admin controls, events, and polls.
-- Separate from `conversations` (which is DM-only: a unique user_a/user_b pair).

-- ── group_chats ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_chats (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text        NOT NULL,
  emoji                text,                                  -- header emoji (🐶 etc.)
  color                text        DEFAULT '#AB00FF',         -- accent color
  avatar_url           text,
  created_by           uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lock_messages        boolean     NOT NULL DEFAULT false,    -- admin-only posting when true
  jam_meet_id          uuid,                                  -- active listening-room meet, if jamming
  member_count         int         NOT NULL DEFAULT 0,
  last_message_at      timestamptz,
  last_message_preview text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS group_chats_creator_idx ON group_chats(created_by);

-- ── members ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_chat_members (
  group_id  uuid        NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  user_id   uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role      text        NOT NULL DEFAULT 'member',  -- 'admin' | 'member'
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, user_id),
  CONSTRAINT group_chat_members_role_check CHECK (role IN ('admin', 'member'))
);

CREATE INDEX IF NOT EXISTS group_chat_members_user_idx ON group_chat_members(user_id);

-- ── messages ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_messages (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id             uuid        NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  sender_id            uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body                 text,
  type                 text        NOT NULL DEFAULT 'text',  -- 'text' | 'spotify_track'
  spotify_track_id     text,
  spotify_track_name   text,
  spotify_track_artist text,
  spotify_album_art    text,
  reply_to_id          uuid,
  reply_to_preview     text,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS group_messages_group_idx ON group_messages(group_id, created_at);

-- ── events (Events tab) ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    uuid        NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  title       text        NOT NULL,
  description text,
  starts_at   timestamptz NOT NULL,
  is_meet     boolean     NOT NULL DEFAULT false,  -- upcoming listening-room meet vs. plain event
  created_by  uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS group_events_group_idx ON group_events(group_id, starts_at);

-- ── polls (Polls tab) ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS group_polls (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id   uuid        NOT NULL REFERENCES group_chats(id) ON DELETE CASCADE,
  question   text        NOT NULL,
  created_by uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS group_polls_group_idx ON group_polls(group_id, created_at DESC);

CREATE TABLE IF NOT EXISTS group_poll_options (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id  uuid NOT NULL REFERENCES group_polls(id) ON DELETE CASCADE,
  text     text NOT NULL,
  position int  NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS group_poll_options_poll_idx ON group_poll_options(poll_id, position);

CREATE TABLE IF NOT EXISTS group_poll_votes (
  poll_id    uuid        NOT NULL REFERENCES group_polls(id) ON DELETE CASCADE,
  option_id  uuid        NOT NULL REFERENCES group_poll_options(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (poll_id, user_id)   -- one vote per poll per user
);

-- ── Helper predicates (SECURITY DEFINER → safe to call from policies) ──────────
CREATE OR REPLACE FUNCTION is_group_member(g uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_chat_members m
    WHERE m.group_id = g AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_group_admin(g uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM group_chat_members m
    WHERE m.group_id = g AND m.user_id = auth.uid() AND m.role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM group_chats c WHERE c.id = g AND c.created_by = auth.uid()
  );
$$;

-- ── Triggers: member count + last message denormalization ──────────────────────
CREATE OR REPLACE FUNCTION bump_group_member_count() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE group_chats SET member_count = member_count + 1 WHERE id = NEW.group_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE group_chats SET member_count = GREATEST(member_count - 1, 0) WHERE id = OLD.group_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_group_member_count ON group_chat_members;
CREATE TRIGGER trg_group_member_count
  AFTER INSERT OR DELETE ON group_chat_members
  FOR EACH ROW EXECUTE FUNCTION bump_group_member_count();

CREATE OR REPLACE FUNCTION bump_group_last_message() RETURNS trigger AS $$
BEGIN
  UPDATE group_chats
  SET last_message_at = NEW.created_at,
      last_message_preview = COALESCE(NEW.body, CASE WHEN NEW.type = 'spotify_track' THEN '🎵 ' || COALESCE(NEW.spotify_track_name, 'Track') ELSE '' END)
  WHERE id = NEW.group_id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_group_last_message ON group_messages;
CREATE TRIGGER trg_group_last_message
  AFTER INSERT ON group_messages
  FOR EACH ROW EXECUTE FUNCTION bump_group_last_message();

-- ── RLS ─────────────────────────────────────────────────────────────────────────
ALTER TABLE group_chats         ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_chat_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_polls         ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_poll_options  ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_poll_votes    ENABLE ROW LEVEL SECURITY;

-- group_chats: members read; creator inserts; admins update; creator deletes.
CREATE POLICY "Members read group" ON group_chats FOR SELECT USING (is_group_member(id) OR created_by = auth.uid());
CREATE POLICY "Creator inserts group" ON group_chats FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "Admins update group" ON group_chats FOR UPDATE USING (is_group_admin(id)) WITH CHECK (is_group_admin(id));
CREATE POLICY "Creator deletes group" ON group_chats FOR DELETE USING (created_by = auth.uid());

-- members: members read; creator/admin add others, users add self; admin updates roles;
-- self-leave or admin removal.
CREATE POLICY "Members read membership" ON group_chat_members FOR SELECT USING (is_group_member(group_id) OR user_id = auth.uid());
CREATE POLICY "Add group members" ON group_chat_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR is_group_admin(group_id)
    OR EXISTS (SELECT 1 FROM group_chats c WHERE c.id = group_id AND c.created_by = auth.uid())
  );
CREATE POLICY "Admins update roles" ON group_chat_members FOR UPDATE
  USING (is_group_admin(group_id)) WITH CHECK (is_group_admin(group_id));
CREATE POLICY "Leave or admin removes" ON group_chat_members FOR DELETE
  USING (auth.uid() = user_id OR is_group_admin(group_id));

-- messages: members read; post when member AND (not locked OR admin); author/admin delete.
CREATE POLICY "Members read messages" ON group_messages FOR SELECT USING (is_group_member(group_id));
CREATE POLICY "Members post messages" ON group_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND is_group_member(group_id)
    AND (
      is_group_admin(group_id)
      OR NOT EXISTS (SELECT 1 FROM group_chats c WHERE c.id = group_id AND c.lock_messages)
    )
  );
CREATE POLICY "Author or admin deletes message" ON group_messages FOR DELETE
  USING (auth.uid() = sender_id OR is_group_admin(group_id));

-- events: members read; admins manage.
CREATE POLICY "Members read events" ON group_events FOR SELECT USING (is_group_member(group_id));
CREATE POLICY "Admins create events" ON group_events FOR INSERT WITH CHECK (is_group_admin(group_id));
CREATE POLICY "Admins update events" ON group_events FOR UPDATE USING (is_group_admin(group_id)) WITH CHECK (is_group_admin(group_id));
CREATE POLICY "Admins delete events" ON group_events FOR DELETE USING (is_group_admin(group_id));

-- polls: members read; any member creates; creator/admin deletes.
CREATE POLICY "Members read polls" ON group_polls FOR SELECT USING (is_group_member(group_id));
CREATE POLICY "Members create polls" ON group_polls FOR INSERT WITH CHECK (is_group_member(group_id) AND auth.uid() = created_by);
CREATE POLICY "Creator or admin deletes poll" ON group_polls FOR DELETE USING (auth.uid() = created_by OR is_group_admin(group_id));

CREATE POLICY "Members read poll options" ON group_poll_options FOR SELECT
  USING (EXISTS (SELECT 1 FROM group_polls p WHERE p.id = poll_id AND is_group_member(p.group_id)));
CREATE POLICY "Poll creator adds options" ON group_poll_options FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM group_polls p WHERE p.id = poll_id AND p.created_by = auth.uid()));

CREATE POLICY "Members read poll votes" ON group_poll_votes FOR SELECT
  USING (EXISTS (SELECT 1 FROM group_polls p WHERE p.id = poll_id AND is_group_member(p.group_id)));
CREATE POLICY "Members vote" ON group_poll_votes FOR INSERT
  WITH CHECK (auth.uid() = user_id AND EXISTS (SELECT 1 FROM group_polls p WHERE p.id = poll_id AND is_group_member(p.group_id)));
CREATE POLICY "Change own vote" ON group_poll_votes FOR UPDATE
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Remove own vote" ON group_poll_votes FOR DELETE USING (auth.uid() = user_id);
