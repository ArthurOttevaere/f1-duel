-- ============================================================================
-- 0009 — The model plays by the same rule as the players.
--
-- `predictions` has always carried "your prediction is yours until the race
-- locks, then it's public" (policy `read own or post-lock`). `model_entries`
-- did not: it was `public read`, unconditionally, and `lock_race.py` refreshes
-- the model's entry every hour through a race weekend. So from the moment the
-- model filed — Friday or Saturday, well before lights out — its top 10, its
-- probability matrix and its safety-car bet were readable by anyone with the
-- anon key.
--
-- That is the whole duel given away: the matrix is what the rarity multipliers
-- are computed from, so it says not only what the model picked but which of
-- your own picks it would consider bold.
--
-- `/game` deliberately never selected the order (almanac §9.4), which kept it
-- out of the page — but a policy, not a page, is what makes it private.
--
-- Two changes:
--   1. reads of `model_entries` are cut to races that are no longer open,
--      exactly mirroring the players' policy;
--   2. `model_entry_status` exposes the three columns that were never secret —
--      whether the model has filed, and in which mode — so the game page can
--      still say "model entry is in (post-quali)" while the race is open.
--
-- Nothing changes for the jobs: the service role bypasses RLS.
--
-- Apply in the Supabase SQL editor on the existing project. Safe to re-run.
-- ============================================================================

-- ─── 1. The picks go behind the lock ────────────────────────────────────────

drop policy if exists "public read"    on public.model_entries;
drop policy if exists "read post-lock" on public.model_entries;

-- Same shape as `predictions`' "read own or post-lock", minus the owner half:
-- the model has no owner, so there is nobody who gets to see it early.
create policy "read post-lock" on public.model_entries
  for select using (
    exists (select 1 from public.races r
            where r.id = race_id and r.status <> 'scheduled')
  );

-- ─── 2. What stays public: that it filed, not what it filed ─────────────────
--
-- Deliberately **not** a `security_invoker` view (the `leaderboard` view is
-- one, and should stay one): the point here is to reach past the policy above
-- and publish three harmless columns. It carries no order, no matrix and no
-- safety-car bet, so there is nothing on it to leak.

create or replace view public.model_entry_status as
  select race_id, pre_quali, locked_at
    from public.model_entries;

alter view public.model_entry_status set (security_invoker = false);

comment on view public.model_entry_status is
  'Whether the model has filed an entry for a race, and in which mode — the '
  'only part of model_entries that is public while the race is still open. '
  'Security definer on purpose: it reaches past the "read post-lock" policy '
  'on the table, and exposes no picks (migration 0009).';

grant select on public.model_entry_status to anon, authenticated;
