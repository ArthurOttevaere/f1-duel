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
  created_at timestamptz not null default now()
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
  total           numeric,             -- filled at scoring time
  breakdown       jsonb,
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
  updated_at timestamptz not null default now(),
  unique (user_id, race_id)
);

create table public.results (
  race_id        bigint primary key references public.races (id) on delete cascade,
  classification jsonb not null,       -- {driver_id: official finish position}
  dotd           text,                 -- official Driver of the Day, entered manually
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

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, username)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'username', ''),
      'player_' || substr(replace(new.id::text, '-', ''), 1, 8)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

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

-- ─── Row Level Security ─────────────────────────────────────────────────────

alter table public.profiles       enable row level security;
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
