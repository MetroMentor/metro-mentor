# Metro Mentor

Real, working starter build — Next.js + Supabase. This replaces the in-memory
click-through prototype with an actual database, real sign-up/login, and
data that persists.

## Setup

### 1. Install dependencies
```
npm install
```

### 2. Set up your Supabase project
1. Go to your Supabase project → **SQL Editor** → New query.
2. Paste in everything from `supabase/schema.sql` and run it. This creates
   all the tables (profiles, mentors, requests, sessions, materials,
   reports, subjects) and basic security rules.

### 3. Connect your environment variables
1. Copy `.env.local.example` to a new file called `.env.local`.
2. In Supabase: **Project Settings → API**. Copy the **Project URL** and the
   **anon / publishable key** into `.env.local`.

### 4. Run it locally
```
npm run dev
```
Open http://localhost:3000 — you should see the Metro Mentor login screen.

### 5. Try it out
Use the **Sign up** tab to create a few test accounts — one Student, one
Mentor, one Staff, one Admin, one Teacher — and click through the whole
flow: request a mentor, accept it, log a session, confirm it, certify it.

## Deploying

1. Push this project to a GitHub repository.
2. In Vercel: "Add New Project" → import that repo.
3. In Vercel's project settings, add the same two environment variables
   from your `.env.local` (Supabase URL + anon key).
4. Deploy. Once it's live, connect your `metromentor.org` domain under
   Vercel's Domains settings.

## What's real vs. what's still a placeholder

**Real and working:**
- Actual accounts and login (Supabase Auth) — no more "type any name"
- Actual database — data persists, doesn't reset on refresh
- The full core loop: request → accept → log → confirm → certify
- Disputes, subjects management, reports, admin overview stats

**Still needs work before real students use this:**
- **Microsoft/SLPS-restricted login** — this build uses plain email/password
  sign-up as a placeholder. Swapping in "Sign in with Microsoft" restricted
  to SLPS's tenant is a Supabase Auth provider setting, once you have the
  tenant details from SLPS IT.
- **Real file uploads for study materials** — right now teachers can post a
  title and subject, but the actual file isn't stored yet. Wiring this to
  Supabase Storage is a natural next step.
- **Row Level Security is intentionally loose right now** (any logged-in
  user can read/write broadly) so the first version works without fighting
  permission errors. Before real students are on this, these policies need
  tightening — e.g. students should only see their own requests, not
  everyone's.
- **Mentor self-editing of subjects/availability** — mentors don't yet have
  a page to set their own subjects/period/days after signing up; admin's
  Mentors view is currently read-only.
- **Ratings aren't displayed yet** on mentor cards, though they are being
  recorded.

None of these are big rewrites — they're all natural "next" conversations
to have when you're ready to keep building.
