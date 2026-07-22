# Count It

Log your sets. See your progress. A mobile-first workout tracker you can open at the gym — data syncs across devices through Supabase, hosted on Vercel as an installable PWA.

## Deploy it (about 10 minutes)

### 1. Set up Supabase (database + login)

1. Go to [supabase.com](https://supabase.com) → **New project**. Pick a region near you and set a database password (you won't need it again for this app).
2. Open **SQL Editor** → **New query**, paste the entire contents of `supabase/schema.sql`, press **Run**. You should see "Success. No rows returned".
3. Recommended: **Authentication → Sign In / Providers → Email** → turn **off** "Confirm email", and set **Authentication → URL Configuration → Site URL** to your deployed URL.
4. From **Project Settings → API** copy the **Project URL** and **anon public** key.

### 2. Push this folder to GitHub

Create a repo and upload everything in this folder. `node_modules` and `dist` are already ignored.

### 3. Deploy on Vercel

Import the repo (Vite is auto-detected) and add both environment variables before deploying:

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | your Project URL |
| `VITE_SUPABASE_ANON_KEY` | your anon public key |

### 4. On your phone

Open the URL → create an account → add to home screen (Chrome: ⋮ → *Add to Home screen*; Safari: share → *Add to Home Screen*).

## Using it at the gym

- **+** starts a new session. Pick your split, then **Copy last … session** prefills every exercise and set from the previous time you ran that split.
- Each set is `weight` × `reps`, with a per-set **kg/lb** toggle and a **/side** toggle for single-arm or per-side weights.
- Colored chips record how the set felt (green easy → red very heavy); longer notes are kept too.
- Entries are draft-saved on your phone as you type; **Save session** pushes to Supabase.
- **Progress** charts your best set per session for any exercise. Exercises logged only in lbs are charted in lbs; everything else in kg.

## Local development (optional)

```bash
cp .env.example .env    # fill in your two Supabase values
npm install
npm run dev
```

## If something doesn't work

- **"Supabase isn't connected yet" screen** — the two environment variables are missing or misnamed. They must start with `VITE_`, and you must redeploy after adding them.
- **"new row violates row-level security"** — the schema wasn't run, or ran partially. Re-run `supabase/schema.sql`.
- **Email confirmation lands on localhost** — set the Site URL as in step 1.3.

## What's inside

- React 18 + Vite, one hand-written stylesheet (`src/styles.css`)
- Supabase JS v2 for auth and Postgres with row-level security (`supabase/schema.sql`)
- Installable PWA: `public/manifest.webmanifest` + a small network-first service worker (`public/sw.js`)
