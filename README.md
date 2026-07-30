# FixFlow Pro

Appliance repair job management, engineer assignment, and lead marketplace for Easy Repair.

## Current state

This is the working prototype: it runs entirely in the browser with sample data (no real
database yet). Logins, jobs, leads, and engineers all reset if you refresh the page. It's
built this way deliberately so the whole app could be reviewed and refined quickly — the
Supabase wiring (real accounts, persistent data, the booking form connection) comes next,
one piece at a time, without needing to rebuild the interface.

`src/lib/supabaseClient.js` is already in here ready for that next step, but nothing in
`App.jsx` uses it yet.

## Running it locally

```bash
npm install
npm run dev
```
Then open the local address it prints (usually http://localhost:5173).

## Demo logins

Shown directly on the login screen — click any of them to log straight in (Owner, Staff,
or one of the three Engineers).

## Deploying to Vercel

1. Push this folder to a GitHub repository (see steps below if you haven't done this before).
2. Go to vercel.com → **Add New → Project** → import that GitHub repo.
3. Vercel auto-detects Vite — leave the defaults (build command `npm run build`, output
   directory `dist`) and click **Deploy**.
4. Every future push to the repo's main branch redeploys automatically.

## Pushing this folder to GitHub for the first time

```bash
cd fixflow-project
git init
git add .
git commit -m "Initial FixFlow prototype"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPO-NAME.git
git push -u origin main
```
Create the empty repository on github.com first (no README/license — this folder already
has one), then use the URL GitHub gives you in the `git remote add origin` line above.

## Environment variables (needed once Supabase is wired in — not yet required to run this)

Copy `.env.example` to `.env` and fill in your Supabase anon key:
```bash
cp .env.example .env
```
Get the anon key from Supabase dashboard → Project Settings → API → the `anon` `public` key.
Never commit `.env` itself — it's already in `.gitignore`.

If deploying to Vercel, add the same two variables under
**Project Settings → Environment Variables** in the Vercel dashboard, since Vercel doesn't
read your local `.env` file.
