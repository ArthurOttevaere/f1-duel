# Deployment — F1 Duel (all free tier)

Everything below runs on free plans. Do the steps in order; each one hands
credentials to the next. Estimated time: ~45 min.

## 1. Supabase (database + auth)

1. Create a project at [supabase.com](https://supabase.com) (pick a region near
   you). Save the database password.
2. **SQL editor** → paste and run [`../supabase/schema.sql`](../supabase/schema.sql).
   On an **existing** project, also run any newer files in
   [`../supabase/migrations/`](../supabase/migrations/) in order (e.g.
   `0001_safety_car.sql`). Fresh installs get everything from `schema.sql`.
3. **Authentication → Providers**:
   - **Email**: enable (magic link is on by default).
   - **Google**: create an OAuth client at
     [console.cloud.google.com](https://console.cloud.google.com) (APIs &
     Services → Credentials → OAuth client ID → Web application). Authorized
     redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`. Paste
     the client ID + secret into Supabase.
4. **Authentication → URL Configuration**:
   - Site URL: your Vercel URL (fill in after step 3), or `http://localhost:3000`
     for now.
   - Redirect URLs: add `http://localhost:3000/auth/callback` and
     `https://<your-vercel-app>.vercel.app/auth/callback`.
5. **Settings → API**: copy `Project URL`, `anon public` key, and
   `service_role` key (keep this one secret).

## 2. GitHub Actions (the automation)

In the repo → **Settings → Secrets and variables → Actions → New secret**:

| Secret | Value |
|---|---|
| `SUPABASE_URL` | the Project URL |
| `SUPABASE_SERVICE_KEY` | the `service_role` key |

Then seed the calendar and roster once (Actions tab → **sync-schedule** → Run
workflow). After that the three workflows run on their own schedule
(sync weekly, lock hourly Fri–Sun, score hourly Sun–Tue).

## 3. Vercel (the site)

1. Import the GitHub repo at [vercel.com](https://vercel.com).
2. **Root Directory**: `web`.
3. **Environment Variables**:

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | the Project URL |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the `anon public` key |
   | `NEXT_PUBLIC_MODEL_URL` | *(optional)* your Render URL (step 4) |
   | `NEXT_PUBLIC_CONTACT_EMAIL` | *(optional)* the address `/contact` publishes |
   | `NEXT_PUBLIC_SEASON` | `2026` |

   The site has a built-in `/model` page explaining the opponent, so
   `NEXT_PUBLIC_MODEL_URL` is **optional** — set it only to add a link out to
   the live Flask platform. A `localhost` value is ignored, so leaving it unset
   is safe.

   `NEXT_PUBLIC_CONTACT_EMAIL` is the mailbox the Contact & FAQ page offers for
   bug reports. Leave it unset and the page simply points at GitHub Issues
   instead — worth creating a dedicated address for the project rather than
   publishing a personal one, and it can be added or changed later without a
   deploy.

4. Deploy. Copy the resulting `*.vercel.app` URL back into Supabase step 1.4
   (Site URL + redirect list).

## 4. Render (the live model platform — optional)

The site's `/model` page already explains the opponent without any extra
service. This step is only for hosting the **interactive** Flask prediction
platform and linking to it from the site.

The existing Flask app in `src/app.py`. On [render.com](https://render.com) →
New → Web Service → point at this repo:

- Build command: `pip install -r requirements.txt`
- Start command: `gunicorn --chdir src app:app` *(add `gunicorn` to
  requirements.txt first)*
- Instance: Free.

Copy the Render URL into `NEXT_PUBLIC_MODEL_URL` on Vercel. Free instances
sleep after 15 min; a free [UptimeRobot](https://uptimerobot.com) monitor
pinging the URL every 10 min keeps cold starts rare.

## 5. First-run checklist

- [ ] `schema.sql` applied, no errors.
- [ ] `sync-schedule` ran → `races` and `drivers` are populated.
- [ ] Sign in on the deployed site (magic link arrives, profile row created).
- [ ] Submit a prediction for the next race; confirm it saves.
- [ ] Confirm another account cannot see your picks before lock (RLS check).
- [ ] After the next race weekend, `lock-race` then `score-race` populate the
      duel — verify a score and a standings row appear.

## Local development

See [`../web/README.md`](../web/README.md) and [`../jobs/README.md`](../jobs/README.md).
Everything works locally against the same Supabase project with the same env
vars.
