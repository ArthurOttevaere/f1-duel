-- ============================================================================
-- 0003 — Who is actually playing: real name, country, birth year.
--
-- Deliberately NOT columns on `profiles`: that table is world-readable (the
-- standings, profiles and league pages all select from it), and a player's
-- legal name and age are not game data. They live in their own table that
-- only the owner — and the service role, i.e. the SQL editor — can read.
--
-- Apply in the Supabase SQL editor on the existing project.
-- ============================================================================

create table if not exists public.player_details (
  id         uuid primary key references public.profiles (id) on delete cascade,
  first_name text not null check (char_length(btrim(first_name)) between 1 and 60),
  last_name  text not null check (char_length(btrim(last_name))  between 1 and 60),
  -- ISO 3166-1 alpha-2, uppercase. Null while the player skipped the field.
  country    text check (country ~ '^[A-Z]{2}$'),
  -- Year rather than age: an age is wrong again twelve months later. The upper
  -- bound stays a constant so the check can be immutable; the form is what
  -- enforces "plausible human".
  birth_year int  check (birth_year between 1900 and 2100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace trigger player_details_touch
  before update on public.player_details
  for each row execute function public.touch_updated_at();

alter table public.player_details enable row level security;

-- Private by construction: no "public read" policy here, unlike every other
-- table in this schema. Only the row's owner can see or write it.
drop policy if exists "read own details"   on public.player_details;
drop policy if exists "insert own details" on public.player_details;
drop policy if exists "update own details" on public.player_details;

create policy "read own details" on public.player_details
  for select using (auth.uid() = id);

create policy "insert own details" on public.player_details
  for insert with check (auth.uid() = id);

create policy "update own details" on public.player_details
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- Signup trigger: carry the details the sign-up form collected. Google and
-- magic-link sign-ups never see that form, so they arrive with none and the
-- app asks for them at /welcome instead — hence every field being optional
-- here even though the form requires the name.
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
    -- Google gives us a display name; fall back to the email local part, then
    -- to the user id. Strip anything the username check would reject.
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

  -- The name has to be unique from the first insert, so a clash gets a numeric
  -- suffix rather than failing the whole signup; /welcome then lets the player
  -- pick the name they actually wanted.
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
