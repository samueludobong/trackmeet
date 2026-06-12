-- ─── Note colour ─────────────────────────────────────────────────────────────
-- Optional background colour for a note bubble (hex string, e.g. '#7C3AED').
-- Null = the default translucent bubble.

alter table public.notes add column if not exists color text;
