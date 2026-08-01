-- ============================================================================
-- 0004 — Standings that survive more than 1000 players.
--
-- PostgREST caps every response at `db-max-rows` (1000 by default on Supabase)
-- and does it silently: no error, no warning, just a short list. The standings
-- read the whole `leaderboard` view and the leagues page filtered it with
-- `?user_id=in.(<every member uuid>)`, which additionally blew past the URL
-- length limit somewhere around 200 members.
--
-- These three functions move the filtering, ordering, counting and ranking
-- into SQL so the app can ask for one page at a time.
--
-- Apply in the Supabase SQL editor on the existing project.
-- ============================================================================

-- One page of the standings, global (p_league_id null) or for one league.
-- security invoker: `leaderboard` is already a security_invoker view, and the
-- league_members RLS policy is what stops you paging through a league you are
-- not a member of.
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
  duel_losses  bigint
)
language sql stable security invoker set search_path = public
as $$
  select l.user_id, l.username, l.races_played, l.points,
         l.duel_wins, l.duel_draws, l.duel_losses
    from public.leaderboard l
   where p_league_id is null
      or exists (
           select 1 from public.league_members m
            where m.league_id = p_league_id
              and m.user_id = l.user_id
         )
   -- Ties broken by name so paging is stable: without a total order, a player
   -- can appear on two pages or on none.
   order by l.points desc, l.username asc
   limit  least(greatest(p_limit, 0), 500)
  offset greatest(p_offset, 0);
$$;

-- How many players the above would return without the limit — for page links.
create or replace function public.standings_count(p_league_id bigint default null)
returns bigint
language sql stable security invoker set search_path = public
as $$
  select count(*)
    from public.leaderboard l
   where p_league_id is null
      or exists (
           select 1 from public.league_members m
            where m.league_id = p_league_id
              and m.user_id = l.user_id
         );
$$;

-- How many players stand at or above `p_points`. The model is not a row in
-- `leaderboard`, so this is what tells the app which page its line belongs on
-- and what number to print next to it.
create or replace function public.standings_rank_at(
  p_points    numeric,
  p_league_id bigint default null
)
returns bigint
language sql stable security invoker set search_path = public
as $$
  select count(*)
    from public.leaderboard l
   where l.points >= p_points
     and (p_league_id is null
          or exists (
               select 1 from public.league_members m
                where m.league_id = p_league_id
                  and m.user_id = l.user_id
             ));
$$;
