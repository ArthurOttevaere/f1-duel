-- 0008 — Two emails per Grand Prix.
--
-- See docs/GAME_DESIGN.md §2.7. The game's rhythm is weekly but the product had
-- no outbound voice at all: a player who forgot a Sunday took a zero, never
-- found out, and did not come back. This adds the reminder and the result.
--
-- Four things:
--   1. an opt-out flag and an unguessable unsubscribe token on `profiles`;
--   2. `email_log` — what has already been sent, so a job that re-runs hourly
--      does not re-send hourly;
--   3. `email_recipients()` — who is still owed a given mail for a race,
--      including their address, which lives in `auth.users`;
--   4. `email_prefs()` / `set_email_opt_out()` — the unsubscribe page, keyed on
--      the token so it works for someone who is not signed in.
--
-- Safe to re-run.

-- ─── 1. Preferences ─────────────────────────────────────────────────────────

alter table public.profiles
  add column if not exists email_opt_out boolean not null default false,
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists profiles_unsubscribe_token_key
  on public.profiles (unsubscribe_token);

-- ─── 2. What has been sent ──────────────────────────────────────────────────
--
-- The primary key is the idempotency guarantee. `score_race` re-runs every hour
-- for ten days so a late Driver-of-the-Day entry is picked up; without this
-- table that is ten days of hourly "here is your result" mail to every player.

create table if not exists public.email_log (
  race_id bigint not null references public.races (id) on delete cascade,
  user_id uuid   not null references public.profiles (id) on delete cascade,
  kind    text   not null check (kind in ('lock', 'result')),
  sent_at timestamptz not null default now(),
  primary key (race_id, user_id, kind)
);

-- No policies, on purpose: RLS on with nothing granted means anon and
-- authenticated see nothing at all, and the jobs reach it as service_role,
-- which bypasses RLS. Who was emailed when is nobody else's business.
alter table public.email_log enable row level security;

-- ─── 3. Who is still owed this mail ─────────────────────────────────────────
--
-- security definer because the address lives in `auth.users`, which is not
-- reachable from the API schema. It returns nothing but what a mailer needs.

create or replace function public.email_recipients(
  p_race_id bigint,
  p_kind    text
)
returns table (
  user_id  uuid,
  username text,
  email    text,
  token    uuid,
  entered  boolean
)
language sql stable security definer set search_path = public
as $$
  select p.id,
         p.username,
         u.email::text,
         p.unsubscribe_token,
         exists (
           select 1 from public.predictions pr
            where pr.user_id = p.id and pr.race_id = p_race_id
         )
    from public.profiles p
    join auth.users u on u.id = p.id
   where not p.email_opt_out
     and u.email is not null
     -- An address nobody has confirmed is an address that bounces.
     and u.email_confirmed_at is not null
     and not exists (
           select 1 from public.email_log l
            where l.race_id = p_race_id
              and l.user_id = p.id
              and l.kind = p_kind
         );
$$;

revoke all on function public.email_recipients(bigint, text) from public;
grant execute on function public.email_recipients(bigint, text) to service_role;

-- ─── 4. The unsubscribe page ────────────────────────────────────────────────
--
-- Keyed on the token, not on the session: the whole point is that it works
-- from a mail client, for someone who is not signed in and may never sign in
-- again. The token is a random uuid and unique, so holding it is the
-- credential — the same trade as a league invite code.

create or replace function public.email_prefs(p_token uuid)
returns table (username text, email_opt_out boolean)
language sql stable security definer set search_path = public
as $$
  select p.username, p.email_opt_out
    from public.profiles p
   where p.unsubscribe_token = p_token;
$$;

create or replace function public.set_email_opt_out(p_token uuid, p_value boolean)
returns boolean
language plpgsql volatile security definer set search_path = public
as $$
declare
  found_one boolean;
begin
  update public.profiles
     set email_opt_out = p_value
   where unsubscribe_token = p_token;
  get diagnostics found_one = row_count;
  return found_one;
end;
$$;

grant execute on function public.email_prefs(uuid)               to anon, authenticated;
grant execute on function public.set_email_opt_out(uuid, boolean) to anon, authenticated;
