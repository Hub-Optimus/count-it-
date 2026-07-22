# Count It

Log your sets. See your progress. A mobile-first workout tracker you can open at the gym — data syncs across devices through Supabase, hosted on Vercel as an installable PWA.

Your July 2026 training logs ship inside the app: after you sign in, one tap in Settings imports all 9 sessions so the progress charts work from day one.

## Deploy it (about 10 minutes)

### 1. Set up Supabase (database + login)

1. Go to [supabase.com](https://supabase.com) → **New project** (any name, e.g. `count-it`). Pick a region near you and set a database password (you won't need it again for this app).
2. When the project is ready, open **SQL Editor** → **New query**, paste the entire contents of `supabase/schema.sql` from this repo, and press **Run**. You should see "Success. No rows returned".
3. Optional but recommended for a personal app: go to **Authentication → Sign In / Providers → Email** and turn **off** "Confirm email". Then you can sign in immediately after creating your account, without clicking an email link.
4. Go to **Project Settings → API** and keep this page open — you need two values:
   - **Project URL** (looks like `https://abcdefgh.supabase.co`)
   - **anon public** key (the long string under "Project API keys")

### 2. Push this folder to GitHub

Create a new GitHub repo (e.g. `count-it`) and upload everything in this folder to it. `node_modules` and `dist` are already ignored via `.gitignore`.

### 3. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New → Project** → import your `count-it` repo. Vercel auto-detects Vite; leave build settings as they are.
2. Before deploying, open **Environment Variables** and add both:

   | Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | your Project URL from step 1 |
   | `VITE_SUPABASE_ANON_KEY` | your anon public key from step 1 |

3. Press **Deploy**. In a minute you'll have a URL like `https://count-it.vercel.app`.

### 4. First run on your phone

1. Open the URL on your phone → **Create an account** → sign in.
2. Go to **Settings → Import July 2026 logs**. All 9 sessions appear under Workouts, and Progress starts charting.
3. Add it to your home screen so it opens full-screen like a native app:
   - **Android / Chrome:** menu (⋮) → *Add to Home screen*
   - **iPhone / Safari:** share button → *Add to Home Screen*

## Using it at the gym

- **+** starts a new session. Pick your split, then **Copy last … session** prefills every exercise and set from the previous time you ran that split — you just update the numbers.
- Each set is `weight` × `reps`, with a per-set **kg/lb** toggle (your machines are in lbs, dumbbells in kg — both fine in the same exercise) and a **/side** toggle for single-arm cable work or per-side leg press weights.
- The colored chips record how the set felt (green easy → red very heavy), or keep your longer notes from imported sessions.
- Everything you type is also kept as a draft on your phone, so a reload or dead spot mid-workout never loses your sets. **Save session** pushes to Supabase.
- **Progress** charts your best set per session for any exercise, plus volume per session. Exercises logged only in lbs are charted in lbs; everything else in kg.

## Local development (optional)

```bash
cp .env.example .env    # fill in your two Supabase values
npm install
npm run dev
```

## If something doesn't work

- **"Supabase isn't connected yet" screen** — the two environment variables are missing or misnamed. They must start with `VITE_` exactly as shown, and you must redeploy after adding them.
- **Sign-up says to check email but nothing arrives** — either turn off "Confirm email" in Supabase (step 1.3) or check spam; Supabase's built-in sender is slow on free projects.
- **"new row violates row-level security"** — the schema wasn't run, or was run partially. Re-run `supabase/schema.sql` in the SQL Editor.
- **Import button duplicates sessions** — importing twice creates duplicates on purpose (it never deletes your data). Open a duplicate from the Workouts list and use **Delete workout**.

## What's inside

- React 18 + Vite, no UI framework — one hand-written stylesheet (`src/styles.css`)
- Supabase JS v2 for auth and Postgres with row-level security (`supabase/schema.sql`)
- Installable PWA: `public/manifest.webmanifest` + a small network-first service worker (`public/sw.js`)
- Your transcribed training history: `src/seed/julyLogs.js`

The name "Count It" is a working title — to rename it later, search-and-replace the string in `index.html`, `public/manifest.webmanifest`, and `src/` (plus the icons if you want new artwork).
