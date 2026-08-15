-- ============================================================================
-- 0006 — Operator controls: the model's season score, and removing a player.
--
-- Two problems, both about running the platform rather than playing on it.
--
--   * The model has played every Grand Prix since the season opened, so it
--     arrives at launch day with a full season of points while every human
--     starts at zero. Nobody is going to enjoy chasing a machine that is 400
--     points up before they made their first pick. `model_entries` gets a
--     `counts_in_standings` flag, and the standings only add up the entries
--     that count, so the model's season total can be zeroed — or started from
--     a chosen round — whenever the operator wants.
--
--     Deliberately *not* done by deleting or editing the model's scores: a
--     race result is a fact. Every Grand Prix page still shows exactly what
--     the model scored that weekend, and every duel W/D/L stands. Only the
--     season table, which is the thing that has to be fair to a newcomer,
--     changes.
--
--   * Deleting a player was self-serve only (`delete_account()`), so the
--     operator had no way to remove a test account, a duplicate, or an abusive
--     one short of hand-deleting rows across eight tables in the right order.
--
-- Everything here is operator-only: revoked from anon and authenticated,
-- granted to service_role, and callable in the SQL editor (which runs as the
-- table owner). None of it is reachable from the site.
--
-- Apply in the Supabase SQL editor on the existing project.
-- ============================================================================

-- ─── The flag ───────────────────────────────────────────────────────────────

alter table public.model_entries
  add column if not exists counts_in_standings boolean not null default true;

comment on column public.model_entries.counts_in_standings is
  'Whether this race feeds the model''s season total on the standings. False = '
  'played and scored, but not counted (see admin_model_reset). Never changes '
  'what the race page shows.';

-- The jobs upsert model entries by race_id and never send this column, so a
-- re-lock or a re-score leaves the operator's choice alone.

-- ─── What the standings add up ──────────────────────────────────────────────

-- One definition of "the model's season score", so the page, the jobs and the
-- SQL editor can never disagree about it.
create or replace function public.model_season_points(p_season int)
returns numeric
language sql stable security invoker set search_path = public
as $$
  select coalesce(sum(m.total), 0)::numeric
    from public.model_entries m
    join public.races r on r.id = m.race_id
   where r.season = p_season
     and m.total is not null
     and m.counts_in_standings;
$$;

-- How many races that total is made of — the "Races" column on its line.
create or replace function public.model_season_races(p_season int)
returns bigint
language sql stable security invoker set search_path = public
as $$
  select count(*)
    from public.model_entries m
    join public.races r on r.id = m.race_id
   where r.season = p_season
     and m.total is not null
     and m.counts_in_standings;
$$;

-- ─── Operator: the model's season score ─────────────────────────────────────

-- Round-by-round: what it scored, and whether that is counting. The answer to
-- "why does the board say what it says".
create or replace function public.admin_model_status(p_season int)
returns table (
  round              int,
  race               text,
  status             text,
  model_total        numeric,
  counts_in_standings boolean
)
language sql stable security definer set search_path = public
as $$
  select r.round, r.name, r.status, m.total, m.counts_in_standings
    from public.races r
    left join public.model_entries m on m.race_id = r.id
   where r.season = p_season
   order by r.round;
$$;

-- Zero it. Every race the model has already been scored on stops counting;
-- races still to come are untouched, so it starts collecting again from the
-- next Grand Prix. Returns how many races were dropped.
create or replace function public.admin_model_reset(p_season int)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  n bigint;
begin
  update public.model_entries m
     set counts_in_standings = false
    from public.races r
   where r.id = m.race_id
     and r.season = p_season
     and m.total is not null
     and m.counts_in_standings;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- "The season starts here": everything before p_round stops counting, and
-- everything from it on counts. Returns how many entries changed.
create or replace function public.admin_model_count_from(p_season int, p_round int)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  n bigint;
begin
  update public.model_entries m
     set counts_in_standings = (r.round >= p_round)
    from public.races r
   where r.id = m.race_id
     and r.season = p_season
     and m.counts_in_standings is distinct from (r.round >= p_round);
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Undo: the model's whole season counts again.
create or replace function public.admin_model_restore(p_season int)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  n bigint;
begin
  update public.model_entries m
     set counts_in_standings = true
    from public.races r
   where r.id = m.race_id
     and r.season = p_season
     and not m.counts_in_standings;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ─── Operator: removing a player ────────────────────────────────────────────

-- Everyone on the board, with what the operator needs to decide who is a real
-- player and who is a leftover test account.
create or replace function public.admin_players()
returns table (
  user_id      uuid,
  username     text,
  email        text,
  races_played bigint,
  points       numeric,
  created_at   timestamptz
)
language sql stable security definer set search_path = public, auth
as $$
  select p.id, p.username, u.email::text, l.races_played, l.points, p.created_at
    from public.profiles p
    left join public.leaderboard l on l.user_id = p.id
    left join auth.users u on u.id = p.id
   order by p.created_at;
$$;

-- Delete a player by username, the same way they would delete themselves:
-- remove the auth user and let the foreign keys take the profile, the private
-- details, every prediction and score, the championship pick, league
-- membership and any league they own.
--
-- security definer because auth.users is out of reach otherwise. It takes a
-- username rather than a uuid on purpose — a uuid typo finds nothing, a
-- username typo also finds nothing, and both are better than deleting the
-- wrong row. Raises if the name doesn't exist, so a typo is never a silent
-- no-op.
create or replace function public.admin_delete_player(p_username text)
returns uuid
language plpgsql security definer set search_path = public, auth
as $$
declare
  target uuid;
begin
  select id into target
    from public.profiles
   where lower(username) = lower(btrim(p_username));

  if target is null then
    raise exception 'No player named %', p_username;
  end if;

  delete from auth.users where id = target;
  return target;
end;
$$;

-- ─── Who may call what ──────────────────────────────────────────────────────

-- The two read helpers are part of the game and stay public: the standings
-- page calls them for anyone, signed in or not.
grant execute on function public.model_season_points(int) to anon, authenticated, service_role;
grant execute on function public.model_season_races(int)  to anon, authenticated, service_role;

-- The rest is operator-only. Revoking from public is what actually closes them
-- (postgres grants execute to public by default); service_role is then granted
-- back so `jobs/admin.py` can reach them with the service key, and the SQL
-- editor can always call them as the owner.
revoke all on function public.admin_model_status(int)        from public;
revoke all on function public.admin_model_reset(int)         from public;
revoke all on function public.admin_model_count_from(int, int) from public;
revoke all on function public.admin_model_restore(int)       from public;
revoke all on function public.admin_players()                from public;
revoke all on function public.admin_delete_player(text)      from public;

grant execute on function public.admin_model_status(int)        to service_role;
grant execute on function public.admin_model_reset(int)         to service_role;
grant execute on function public.admin_model_count_from(int, int) to service_role;
grant execute on function public.admin_model_restore(int)       to service_role;
grant execute on function public.admin_players()                to service_role;
grant execute on function public.admin_delete_player(text)      to service_role;
