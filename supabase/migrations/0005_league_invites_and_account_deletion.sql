-- ============================================================================
-- 0005 — Shareable league invites, and accounts players can delete themselves.
--
-- Two additions:
--
--   * `league_by_code()` — what an invite link is worth before you accept it.
--     Joining already went through `join_league()` so codes never have to be
--     readable, but that left the invite page with nothing to show: you were
--     asked to join "a league". This returns the name, the owner and the size
--     for one code, and nothing else — the leagues table stays unreadable to
--     non-members.
--
--   * `delete_account()` — deletes the caller's auth user, which cascades to
--     profiles, player_details, predictions, season_picks, scores and league
--     membership. Previously deletion meant emailing the operator (see the
--     privacy page), which is neither fast nor self-serve.
--
-- Apply in the Supabase SQL editor on the existing project.
-- ============================================================================

-- ─── An invite link, resolved ───────────────────────────────────────────────
-- security definer: the caller is not a member yet, so the RLS policy on
-- `leagues` would hand them nothing. Returns at most one row, only ever for a
-- code the caller already holds.
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

-- ─── Deleting your own account ──────────────────────────────────────────────
-- security definer so it can reach auth.users, which the anon role cannot
-- touch. It only ever deletes the caller's own row.
--
-- Everything else follows the foreign keys: profiles (on delete cascade from
-- auth.users) takes player_details, predictions, season_picks, scores, league
-- membership and any league the player owns with it.
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
