-- ============================================================================
-- 0002 — Every player picks their own username, including OAuth sign-ups.
--
-- Google (and magic-link) sign-ups never passed through the sign-up form, so
-- handle_new_user() fell back to `player_<id>` and the player was stuck with
-- it. Track whether the name was actually chosen, so the app can send those
-- accounts through /welcome once.
--
-- Apply in the Supabase SQL editor on the existing project.
-- ============================================================================

alter table public.profiles
  add column if not exists username_set boolean not null default true;

-- Existing accounts still carrying a generated name have not chosen one.
update public.profiles
   set username_set = false
 where username ~ '^player_[0-9a-f]{8}$';

-- Signup trigger: keep the chosen username when the form provided one, and
-- otherwise seed a *suggestion* from the OAuth identity that the player is
-- then asked to confirm or replace.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  chosen    text := nullif(new.raw_user_meta_data ->> 'username', '');
  suggested text;
  candidate text;
  n         int  := 0;
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
  return new;
end;
$$;

-- Usernames are shown as identity, so "Max" and "max" must not coexist.
-- Skipped (with a notice) if the existing rows already clash.
do $$
begin
  create unique index if not exists profiles_username_ci_key
    on public.profiles (lower(username));
exception when others then
  raise notice 'profiles_username_ci_key skipped: %', sqlerrm;
end $$;

-- Availability check for the sign-up form: `profiles` is publicly readable, so
-- this only saves the client a round-trip shaped like a scan.
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
