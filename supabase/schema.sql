-- ============================================================================
-- F1 Duel — Supabase schema
-- Apply in the Supabase SQL editor (or `supabase db push`) on a fresh project.
-- Game rules reference: docs/GAME_DESIGN.md
--
-- Write model: everything is written by the GitHub Actions jobs through the
-- service-role key (which bypasses RLS), except `profiles`, `predictions`,
-- `season_picks` and league membership, which players write themselves under
-- the RLS policies below.
-- ============================================================================

-- ─── Tables ─────────────────────────────────────────────────────────────────

create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null unique check (username ~ '^[A-Za-z0-9_]{3,20}$'),
  -- false while the name is only a suggestion (OAuth signup): the app then
  -- sends the player through /welcome to choose one.
  username_set boolean not null default true,
  created_at timestamptz not null default now()
);

-- "Max" and "max" are the same identity to a reader, so reserve both.
create unique index profiles_username_ci_key on public.profiles (lower(username));

-- Who the player actually is. Kept out of `profiles` on purpose: that table is
-- world-readable, and a legal name and age are not game data. Owner-only under
-- RLS — the service role (SQL editor) is what reads this in aggregate.
create table public.player_details (
  id         uuid primary key references public.profiles (id) on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 60),
  last_name  text not null check (char_length(btrim(last_name))  between 1 and 60),
  country    text check (country ~ '^[A-Z]{2}$'),   -- ISO 3166-1 alpha-2
  -- Year rather than age: an age is wrong again twelve months later.
  birth_year int  check (birth_year between 1900 and 2100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Season roster, synced weekly from FastF1 (also powers profile theming).
create table public.drivers (
  season     int  not null,
  driver_id  text not null,            -- FastF1 DriverId slug, e.g. 'max_verstappen'
  code       text not null,            -- 'VER'
  full_name  text not null,
  team       text not null,
  team_color text,                     -- '#3671C6'
  active     boolean not null default true,
  primary key (season, driver_id)
);

create table public.races (
  id       bigint generated always as identity primary key,
  season   int  not null,
  round    int  not null,
  name     text not null,
  circuit  text,
  country  text,
  quali_at timestamptz,
  race_at  timestamptz,
  status   text not null default 'scheduled'
           check (status in ('scheduled', 'locked', 'scored')),
  unique (season, round)
);

-- The model's entry in the duel: its predicted order and the Monte-Carlo
-- position-probability matrix frozen at lock time (drives rarity multipliers).
create table public.model_entries (
  race_id         bigint primary key references public.races (id) on delete cascade,
  predicted_order jsonb not null,      -- full ordered list of driver_ids
  prob_matrix     jsonb not null,      -- {driver_id: [p_pos1 … p_posN]}
  pre_quali       boolean not null default false,
  sc_prob         numeric,             -- model P(safety car), circuit prior
  sc_bet          boolean,             -- model's safety-car Yes/No bet
  total           numeric,             -- filled at scoring time
  breakdown       jsonb,
  -- Whether this race feeds the model's season total on the standings. The
  -- operator can drop past races so the machine doesn't start launch day with
  -- a season of points on every human — see migration 0006. The race page
  -- always shows the real score whatever this says.
  counts_in_standings boolean not null default true,
  locked_at       timestamptz not null default now()
);

create or replace function public.valid_picks(p jsonb)
returns boolean
language sql immutable
as $$
  select jsonb_typeof(p) = 'array'
     and jsonb_array_length(p) = 10
     and (select count(distinct v) from jsonb_array_elements_text(p) v) = 10;
$$;

create table public.predictions (
  id         bigint generated always as identity primary key,
  user_id    uuid   not null references public.profiles (id) on delete cascade,
  race_id    bigint not null references public.races (id) on delete cascade,
  picks      jsonb  not null check (public.valid_picks(picks)),
  dotd       text,                     -- Driver of the Day vote (optional)
  sc_bet     boolean,                  -- safety-car side bet: Yes/No (optional)
  updated_at timestamptz not null default now(),
  unique (user_id, race_id)
);

create table public.results (
  race_id        bigint primary key references public.races (id) on delete cascade,
  classification jsonb not null,       -- {driver_id: official finish position}
  dotd           text,                 -- official Driver of the Day, entered manually
  safety_car     boolean,              -- was a SC/VSC deployed during the race
  scored_at      timestamptz
);

-- One row per player per scored race. The model's score lives in model_entries.
create table public.scores (
  race_id    bigint  not null references public.races (id) on delete cascade,
  user_id    uuid    not null references public.profiles (id) on delete cascade,
  total      numeric not null,
  breakdown  jsonb   not null,
  beat_model boolean not null default false,
  drew_model boolean not null default false,
  primary key (race_id, user_id)
);

-- Champion picks: insert-only (locked by design, no UPDATE policy exists).
-- rank/prorate columns are filled by the weekly sync job, bonuses awarded at
-- season end per docs/GAME_DESIGN.md §2.3.
create table public.season_picks (
  user_id            uuid not null references public.profiles (id) on delete cascade,
  season             int  not null,
  champion_driver    text not null,
  champion_team      text not null,
  locked_at          timestamptz not null default now(),
  driver_rank_at_lock int,
  team_rank_at_lock   int,
  prorate            numeric,
  awarded_points     numeric,     -- settled at season end (jobs/settle_season.py)
  primary key (user_id, season)
);

create table public.leagues (
  id         bigint generated always as identity primary key,
  name       text not null check (char_length(name) between 3 and 30),
  code       text not null unique default upper(substr(md5(random()::text), 1, 6)),
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table public.league_members (
  league_id bigint not null references public.leagues (id) on delete cascade,
  user_id   uuid   not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (league_id, user_id)
);

create index on public.predictions (race_id);
create index on public.scores (user_id);
create index on public.league_members (user_id);

-- ─── Auth: auto-create a profile on signup ─────────────────────────────────

-- Keeps the username and the details from the sign-up form; for OAuth sign-ups
-- (no form) it seeds a unique username suggestion, flags it as not-yet-chosen
-- and writes no details, so the app collects both at /welcome instead.
-- See migrations 0002 and 0003.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  chosen    text := nullif(new.raw_user_meta_data ->> 'username', '');
  suggested text;
  candidate text;
  n         int  := 0;
  f_name    text := nullif(btrim(new.raw_user_meta_data ->> 'first_name'), '');
  l_name    text := nullif(btrim(new.raw_user_meta_data ->> 'last_name'), '');
  ctry      text := nullif(upper(btrim(new.raw_user_meta_data ->> 'country')), '');
  b_year    int;
begin
  if chosen is not null and chosen ~ '^[A-Za-z0-9_]{3,20}$' then
    suggested := chosen;
  else
    suggested := coalesce(
      nullif(new.raw_user_meta_data ->> 'name', ''),
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(coalesce(new.email, ''), '@', 1),
      ''
    );
    suggested := left(regexp_replace(suggested, '[^A-Za-z0-9_]', '_', 'g'), 20);
    if length(suggested) < 3 then
      suggested := 'player_' || substr(replace(new.id::text, '-', ''), 1, 8);
    end if;
  end if;

  -- A clash gets a numeric suffix rather than failing the signup outright;
  -- /welcome then lets the player pick the name they actually wanted.
  candidate := suggested;
  while exists (select 1 from public.profiles p
                 where lower(p.username) = lower(candidate)) loop
    n := n + 1;
    candidate := left(suggested, 16) || n::text;
  end loop;

  insert into public.profiles (id, username, username_set)
  values (new.id, candidate, candidate is not distinct from chosen)
  on conflict (id) do nothing;

  -- Never let a malformed metadata field fail the whole signup.
  begin
    b_year := nullif(new.raw_user_meta_data ->> 'birth_year', '')::int;
  exception when others then
    b_year := null;
  end;

  if f_name is not null and l_name is not null then
    insert into public.player_details (id, first_name, last_name, country, birth_year)
    values (
      new.id,
      left(f_name, 60),
      left(l_name, 60),
      case when ctry ~ '^[A-Z]{2}$' then ctry end,
      case when b_year between 1900 and 2100 then b_year end
    )
    on conflict (id) do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Availability check for the username form.
create or replace function public.username_available(p_username text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select p_username ~ '^[A-Za-z0-9_]{3,20}$'
     and not exists (
       select 1 from public.profiles
        where lower(username) = lower(trim(p_username))
          and id is distinct from auth.uid()
     );
$$;

-- ─── Predictions housekeeping ───────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger predictions_touch
  before update on public.predictions
  for each row execute function public.touch_updated_at();

create trigger player_details_touch
  before update on public.player_details
  for each row execute function public.touch_updated_at();

-- ─── Leagues: membership helpers ────────────────────────────────────────────

-- security definer so league RLS policies can check membership without recursing.
create or replace function public.is_league_member(l bigint)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.league_members
    where league_id = l and user_id = auth.uid()
  );
$$;

-- Joining goes through this function so league codes never need to be readable.
create or replace function public.join_league(p_code text)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  l bigint;
begin
  select id into l from public.leagues where code = upper(trim(p_code));
  if l is null then
    raise exception 'Unknown league code';
  end if;
  insert into public.league_members (league_id, user_id)
  values (l, auth.uid())
  on conflict do nothing;
  return l;
end;
$$;

-- What an invite link is worth before you accept it: the name, the owner and
-- the size for one code, and nothing else. security definer because the person
-- opening the link is not a member yet, so league RLS would give them nothing.
-- See migration 0005.
create or replace function public.league_by_code(p_code text)
returns table (
  id             bigint,
  name           text,
  member_count   bigint,
  owner_username text,
  is_member      boolean
)
language sql stable security definer set search_path = public
as $$
  select
    l.id,
    l.name,
    (select count(*) from public.league_members m where m.league_id = l.id),
    p.username,
    exists (
      select 1 from public.league_members m
       where m.league_id = l.id and m.user_id = auth.uid()
    )
  from public.leagues l
  join public.profiles p on p.id = l.owner_id
  where l.code = upper(btrim(p_code));
$$;

revoke all on function public.league_by_code(text) from public;
grant execute on function public.league_by_code(text) to anon, authenticated;

create or replace function public.add_owner_as_member()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.league_members (league_id, user_id)
  values (new.id, new.owner_id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger league_owner_joins
  after insert on public.leagues
  for each row execute function public.add_owner_as_member();

-- ─── Deleting your own account ──────────────────────────────────────────────

-- security definer so it can reach auth.users, which the anon role cannot
-- touch; it only ever deletes the caller's own row. Everything else follows
-- the foreign keys — profiles cascades from auth.users and takes details,
-- predictions, season picks, scores, league membership and owned leagues with
-- it. See migration 0005.
create or replace function public.delete_account()
returns void
language plpgsql security definer set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;

-- ─── Row Level Security ─────────────────────────────────────────────────────

alter table public.profiles       enable row level security;
alter table public.player_details enable row level security;
alter table public.drivers        enable row level security;
alter table public.races          enable row level security;
alter table public.model_entries  enable row level security;
alter table public.predictions    enable row level security;
alter table public.results        enable row level security;
alter table public.scores         enable row level security;
alter table public.season_picks   enable row level security;
alter table public.leagues        enable row level security;
alter table public.league_members enable row level security;

-- Public game data: readable by everyone, written only by the service role.
create policy "public read" on public.profiles      for select using (true);
create policy "public read" on public.drivers       for select using (true);
create policy "public read" on public.races         for select using (true);
create policy "public read" on public.model_entries for select using (true);
create policy "public read" on public.results       for select using (true);
create policy "public read" on public.scores        for select using (true);
create policy "public read" on public.season_picks  for select using (true);

create policy "update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Personal data: private by construction, no public read. Only the owner (and
-- the service role, which bypasses RLS) ever sees a player_details row.
create policy "read own details" on public.player_details
  for select using (auth.uid() = id);
create policy "insert own details" on public.player_details
  for insert with check (auth.uid() = id);
create policy "update own details" on public.player_details
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Fair play: your prediction is yours until the race locks, then it's public.
create policy "read own or post-lock" on public.predictions
  for select using (
    auth.uid() = user_id
    or exists (select 1 from public.races r
               where r.id = race_id and r.status <> 'scheduled')
  );

create policy "insert own while open" on public.predictions
  for insert with check (
    auth.uid() = user_id
    and exists (select 1 from public.races r
                where r.id = race_id
                  and r.status = 'scheduled'
                  and now() < r.race_at)
  );

create policy "update own while open" on public.predictions
  for update using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (select 1 from public.races r
                where r.id = race_id
                  and r.status = 'scheduled'
                  and now() < r.race_at)
  );

-- Champion picks: one shot, no updates.
create policy "insert own once" on public.season_picks
  for insert with check (auth.uid() = user_id);

-- Leagues: visible to members only; codes stay secret (join via join_league()).
create policy "members read" on public.leagues
  for select using (owner_id = auth.uid() or public.is_league_member(id));
create policy "create own" on public.leagues
  for insert with check (owner_id = auth.uid());
create policy "owner deletes" on public.leagues
  for delete using (owner_id = auth.uid());

create policy "members read" on public.league_members
  for select using (public.is_league_member(league_id));
create policy "leave league" on public.league_members
  for delete using (auth.uid() = user_id);

-- ─── Leaderboard ────────────────────────────────────────────────────────────

create view public.leaderboard
with (security_invoker = true) as
select
  p.id            as user_id,
  p.username,
  count(s.race_id)                                        as races_played,
  coalesce(sum(s.total), 0)::numeric
    + coalesce((select sum(sp.awarded_points)
                from public.season_picks sp
                where sp.user_id = p.id
                  and sp.awarded_points is not null), 0)  as points,
  count(*) filter (where s.beat_model)                    as duel_wins,
  count(*) filter (where s.drew_model)                    as duel_draws,
  count(*) filter (where s.race_id is not null
                     and not s.beat_model
                     and not s.drew_model)                as duel_losses
from public.profiles p
left join public.scores s on s.user_id = p.id
group by p.id, p.username;

-- ─── Standings paging ───────────────────────────────────────────────────────

-- PostgREST caps responses at `db-max-rows` (1000 by default) without saying
-- so. Filtering, ordering, counting and ranking live here rather than in the
-- page, so the app can ask for one page at a time. See migration 0004.

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

-- ─── The model's season score, and who counts ───────────────────────────────

-- Mirrors migration 0006. `counts_in_standings` above is the switch; these are
-- what reads it and what an operator turns it with.

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
