-- Atomically record or change a poll vote.
-- p_post_id     — the post whose poll_options to update
-- p_opt_id      — the option being voted FOR
-- p_prev_opt_id — the option previously voted for (null on first vote)
--
-- SECURITY DEFINER so any authenticated user can write to posts
-- they don't own (RLS would otherwise block the update).

CREATE OR REPLACE FUNCTION vote_on_poll(
  p_post_id     uuid,
  p_opt_id      text,
  p_prev_opt_id text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_opts jsonb;
  v_new  jsonb;
BEGIN
  SELECT poll_options INTO v_opts
  FROM posts
  WHERE id = p_post_id;

  IF v_opts IS NULL THEN
    RETURN jsonb_build_object('error', 'poll not found');
  END IF;

  -- Increment the new option, decrement the previous one (if any).
  -- GREATEST(..., 0) guards against going negative.
  SELECT jsonb_agg(
    CASE
      WHEN (o->>'id') = p_opt_id THEN
        jsonb_set(o, '{votes}', to_jsonb(GREATEST(COALESCE((o->>'votes')::int, 0) + 1, 0)))
      WHEN p_prev_opt_id IS NOT NULL AND (o->>'id') = p_prev_opt_id THEN
        jsonb_set(o, '{votes}', to_jsonb(GREATEST(COALESCE((o->>'votes')::int, 0) - 1, 0)))
      ELSE o
    END
  )
  INTO v_new
  FROM jsonb_array_elements(v_opts) o;

  UPDATE posts
  SET poll_options = v_new
  WHERE id = p_post_id;

  RETURN jsonb_build_object('success', true, 'options', v_new);
END;
$$;
