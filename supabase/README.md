# Supabase — F1 Duel database

All game state lives here (Postgres + Auth + Row Level Security). The Flask
model app never touches it; the game frontend (`web/`) and the automation
(`jobs/`) do.

## First-time setup

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL editor, run [`schema.sql`](schema.sql). It is idempotent enough to
   read top-to-bottom once on a fresh project (tables, triggers, RLS, the
   `leaderboard` view).
3. **Auth → Providers**: enable **Email** (magic link) and **Google** (add the
   OAuth client ID/secret). Set the Site URL and add
   `http://localhost:3000/auth/callback` + your Vercel URL to the redirect
   allow-list.
4. Copy the keys into the two consumers:
   - `web/.env.local` → `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - GitHub Actions secrets → `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
5. Seed the calendar and roster: run `python jobs/sync_schedule.py 2026` (locally
   with the env vars set, or trigger the `sync-schedule` workflow).

## Security model

- **anon key** (browser): every table is guarded by the RLS policies in
  `schema.sql`. A signed-in user can only write their own prediction, and only
  while the race is still open; everyone's picks stay hidden until lights-out.
- **service_role key** (jobs only, never shipped to the client): bypasses RLS
  to write races, model entries, results and scores.

The `join_league` RPC is `security definer` so league codes never have to be
readable client-side — you join by code without being able to enumerate leagues.
`league_by_code()` (migration 0005) is the same trade for invite links: it
returns the name, owner and size of the single league whose code you already
hold, so `/join/<code>` can say what it is inviting you to. Holding a code is
the credential in both cases — treat a league link like a party invite, not a
password.

`delete_account()` (also 0005) is `security definer` so it can reach
`auth.users`, which the anon role cannot; it deletes the caller's own row and
nothing else, and the foreign keys cascade from there.

## Personal data

`profiles` is world-readable — it is the standings. Real names, countries and
birth years therefore live in `player_details`, the one table with **no public
read policy**: only the row's owner sees it through the anon key. To look at who
is playing, query it from the SQL editor (service role):

```sql
select p.username, d.first_name, d.last_name, d.country, d.birth_year, d.created_at
  from public.player_details d
  join public.profiles p on p.id = d.id
 order by d.created_at desc;
```

Collecting this makes you a data controller under the GDPR: say what you collect
and why on the site, and be able to delete it on request. Players do this
themselves from their profile page — `delete_account()` (migration 0005) deletes
their `auth.users` row, which cascades to `profiles`, `player_details`,
`predictions`, `season_picks`, `scores`, league membership and any league they
own. Deleting the auth user from the dashboard has exactly the same effect, and
so does `select admin_delete_player('<username>');` (migration 0006), which is
the same cascade by name instead of by uuid — `python jobs/admin.py
delete-player <username>` is the same call from a terminal.

## Operator controls (migration 0006)

The model plays every Grand Prix whether or not anyone else is on the platform,
so it arrives at launch with a season of points against humans who have none.
`model_entries.counts_in_standings` decides whether a race feeds its **season
total**; the race pages and every duel W/D/L ignore the flag entirely, so
nothing here rewrites a result.

```sql
select * from admin_model_status(2026);   -- round by round: scored? counting?
select admin_model_reset(2026);           -- its season total -> 0, from now on
select admin_model_count_from(2026, 15);  -- the season starts at round 15
select admin_model_restore(2026);         -- undo: the whole season counts
select * from admin_players();            -- everyone, with email and points
select admin_delete_player('someuser');   -- remove a player, no undo
```

These are revoked from `anon` and `authenticated` and granted to
`service_role`, so they are reachable from the SQL editor and from
`jobs/admin.py`, and from nowhere in the site. The public half —
`model_season_points(season)` and `model_season_races(season)` — is what the
standings page reads.

## Migrations

`schema.sql` is the state of record for a fresh project. Existing projects apply
the numbered files in `migrations/` in order, in the SQL editor:

| File | What it adds |
| --- | --- |
| `0001_safety_car.sql` | Safety-car side bet |
| `0002_username_choice.sql` | Player-chosen usernames, incl. OAuth sign-ups |
| `0003_player_details.sql` | Private `player_details` (name, country, birth year) |
| `0004_standings_pagination.sql` | `standings_page/count/rank_at` — paged standings past 1000 players |
| `0005_league_invites_and_account_deletion.sql` | `league_by_code()` (invite links) and `delete_account()` (self-serve deletion) |
| `0006_admin_controls.sql` | `model_entries.counts_in_standings` + the operator functions: reset/restore the model's season score, list and delete players |

## The 1000-row cap

Supabase's Data API truncates every response at **`db-max-rows` (1000 by
default)** and returns no error when it does. Any read that can grow with the
number of players must therefore page explicitly:

- `jobs/db.py` `select()` pages until the table is exhausted, and `count()`
  exists so `score_race.py` can refuse to score a partially-read field.
- The standings and league boards go through `standings_page()`, which does the
  filtering, ordering and limiting in SQL.

Do not add an unfiltered `.select()` on `profiles`, `predictions`, `scores` or
`leaderboard` — it will look fine until the thousand-and-first row.
