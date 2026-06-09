-- Optional caption overlay rendered on top of a music story card.
-- font  — one of: "default" | "serif" | "script" | "mono" | "heavy"
-- color — any CSS-style color string (the picker writes hex)
alter table public.stories add column if not exists overlay_text  text;
alter table public.stories add column if not exists overlay_font  text;
alter table public.stories add column if not exists overlay_color text;
