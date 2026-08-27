-- ============================================================================
-- 0010 — A profile picks the colour it wears.
--
-- The profile page is painted end to end by the player's championship call:
-- cover, avatar ring, season curve, betting stubs. Until now that colour was
-- always the *constructor's* — and a driver and their team are often two
-- shades of the same hue, so the one identity choice on the site was invisible
-- half the time.
--
-- One column, two values. `driver` is the default because the portrait of that
-- driver is already the face of the page; `team` repaints everything in the
-- constructor's colour instead.
--
-- The app treats a missing column as `driver`, so a deploy that lands before
-- this migration loses the switch and nothing else.
-- ============================================================================

alter table public.profiles
  add column if not exists theme text not null default 'driver'
    check (theme in ('driver', 'team'));

-- No new policy: `update own profile` already covers every column of the row.
