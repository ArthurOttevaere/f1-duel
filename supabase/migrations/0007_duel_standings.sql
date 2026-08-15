-- 0007 — The standings rank on the duel, not on a points pile.
--
-- See docs/GAME_DESIGN.md §2.5. Ranking on cumulative points made the board a
-- measure of how long a player had been here: the model had eleven Grands Prix
-- and 402 points, so anyone joining at round 12 opened the standings to find a
-- machine in P1 and a deficit no amount of good play could close.
--
-- Three parts:
--   1. the duel bonus (+10 win / +3 draw) comes out of the history;
--   2. `leaderboard` gains `margin` and loses the championship bonus from
--      `points`;
--   3. `standings_page` returns the margin and orders on the duel.
--
-- Safe to re-run: part 1 is guarded on the key still being present, and the
-- rest is create-or-replace.

-- ─── 1. Unpay the duel ──────────────────────────────────────────────────────
--
-- The verdict does not move. `finalize()` always decided beat/draw on the
-- total *before* the duel bonus was added, so subtracting the bonus lands
-- exactly on the number the verdict was taken from — `beat_model` and
-- `drew_model` stay true as recorded.

update public.scores s
   set total = s.total
             - coalesce((s.breakdown -> 'bonuses' ->> 'duel')::numeric, 0),
       breakdown = jsonb_set(
         jsonb_set(
           s.breakdown,
           '{bonuses}',
           (s.breakdown -> 'bonuses') - 'duel'
         ),
         '{total}',
         to_jsonb(
           s.total - coalesce((s.breakdown -> 'bonuses' ->> 'duel')::numeric, 0)
         )
       )
 where s.breakdown -> 'bonuses' ? 'duel';

-- Backfill the per-race margin that `finalize()` now writes, so a stored
-- breakdown from before this migration reads the same as one from after it.
update public.scores s
   set breakdown = jsonb_set(
         s.breakdown,
         '{margin}',
         case
           when s.breakdown ->> 'model_total' is null then 'null'::jsonb
           else to_jsonb(s.total - (s.breakdown ->> 'model_total')::numeric)
         end
       )
 where not (s.breakdown ? 'margin');

-- ─── 2. The leaderboard ─────────────────────────────────────────────────────
--
-- `margin` is appended last: `create or replace view` allows new columns only
-- at the end, and every function below selects by name anyway.
--
-- `points` is now race points only. The championship payout used to be added
-- here; it left a board of race results carrying a bonus that came from no
-- race, which read as a bug once points stopped being the ranking key.
-- `season_picks.awarded_points` is still written by settle_season.py and is
-- the season recap's to spend (GAME_DESIGN §2.3).

create or replace view public.leaderboard
with (security_invoker = true) as
select
  p.id            as user_id,
  p.username,
  count(s.race_id)                                        as races_played,
  coalesce(sum(s.total), 0)::numeric                      as points,
  count(*) filter (where s.beat_model)                    as duel_wins,
  count(*) filter (where s.drew_model)                    as duel_draws,
  count(*) filter (where s.race_id is not null
                     and not s.beat_model
                     and not s.drew_model)                as duel_losses,
  -- Summed over the races this player entered, so the model is exactly 0 and
  -- a player who joined at round 12 starts level rather than 402 behind. A
  -- race the model never scored contributes nothing either way.
  coalesce(sum(
    case when m.total is null then 0 else s.total - m.total end
  ), 0)::numeric                                          as margin
from public.profiles p
left join public.scores s on s.user_id = p.id
left join public.model_entries m on m.race_id = s.race_id
group by p.id, p.username;

-- ─── 3. One page of the board ───────────────────────────────────────────────
--
-- Dropped rather than replaced: the return type gains a column, and
-- `create or replace function` cannot change a signature.

drop function if exists public.standings_page(bigint, int, int);

create or replace function public.standings_page(
  p_league_id bigint default null,
  p_limit     int    default 100,
  p_offset    int    default 0
)
returns table (
  user_id      uuid,
  username     text,
  races_played bigint,
  points       numeric,
  duel_wins    bigint,
  duel_draws   bigint,
  duel_losses  bigint,
  margin       numeric
)
language sql stable security invoker set search_path = public
as $$
  select l.user_id, l.username, l.races_played, l.points,
         l.duel_wins, l.duel_draws, l.duel_losses, l.margin
    from public.leaderboard l
   where p_league_id is null
      or exists (
           select 1 from public.league_members m
            where m.league_id = p_league_id
              and m.user_id = l.user_id
         )
   -- The duel decides it: Grands Prix won, then how convincingly, then the
   -- raw pile. Ties broken by name last so paging stays stable — without a
   -- total order a player can appear on two pages or on none.
   order by l.duel_wins desc, l.margin desc, l.points desc, l.username asc
   limit  least(greatest(p_limit, 0), 500)
  offset greatest(p_offset, 0);
$$;

-- `standings_rank_at` is left in place deliberately. Nothing calls it now that
-- the model is not a row in the table, but it is exactly what would put it
-- back, and the operator escape hatches from 0006
-- (`model_entries.counts_in_standings`, `admin_model_reset`) are kept for the
-- same reason.
