# F1 Duel — web

The game platform: home page + duel UI. Next.js (App Router, TypeScript,
Tailwind v4) talking to Supabase. Deployed on Vercel.

## Develop

```bash
cp .env.local.example .env.local   # fill in Supabase URL + anon key
npm install
npm run dev                        # http://localhost:3000
```

The Supabase project must have `../supabase/schema.sql` applied and the
calendar/roster seeded (`python ../jobs/sync_schedule.py`). See
`../supabase/README.md`.

## Layout

```
app/
  page.tsx              Home (hero + game/model sections + footer)
  login/                Magic-link + Google auth
  auth/                 OAuth callback, OTP confirm, sign-out route handlers
  game/                 Duel dashboard, race review, standings, leagues, picks
  profile/[username]/   Stats + duel history, themed by championship pick
components/             SiteNav, SiteFooter, PredictionEditor (dnd), Countdown, …
lib/
  supabase/             Browser + server clients (@supabase/ssr)
  types.ts              Row types mirroring supabase/schema.sql
  format.ts             Display helpers
middleware.ts           Refreshes the Supabase auth session
```

Design language (dark motorsport aesthetic, palette + easings) is carried over
from the model page in `../webapp/static/css/style.css` and lives in
`app/globals.css`.
