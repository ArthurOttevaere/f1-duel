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
