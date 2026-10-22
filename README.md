# CampusCode

A college competitive-programming network: link your Codeforces, LeetCode, CodeChef and
AtCoder accounts, get one comparable CampusCode score, and climb your college, department,
course, batch, friends and class leaderboards.

## Features

- **Unified profiles** — one account that mirrors your rating, contest record, problems solved
  and rank on all four platforms.
- **CampusCode score (0–1000)** — a documented blend of platform rating strength, cohort
  percentile, participation consistency and recent improvement. See `/methodology`.
- **Class tiers** — Class S / A / B / C, derived from the score, with progress to the next tier.
- **Leaderboards** — college, department, course, academic year, batch, friends, per-platform
  and per-class boards. Every board states the metric it measures.
- **Contest calendar** — upcoming, ongoing and completed contests from all four platforms in
  your timezone, with per-contest reminders and an `.ics` export.
- **Community** — friends, friend requests, groups, group challenges, goals, activity feed and
  a searchable student directory.
- **Privacy** — per-profile visibility, directory opt-in, and a full account deletion flow.

## Stack

Next.js 16 (App Router, Cache Components, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 ·
Prisma 7 with SQLite (better-sqlite3) · zod · Recharts.

## Getting started

```bash
npm install
cp .env .env.local        # optional; the repo ships a working .env
npm run setup             # prisma generate + migrate deploy + seed + sync:contests
npm run dev
```

Open <http://localhost:3000>.

`npm run setup` does four things:

1. `prisma generate` — generates the Prisma client into `src/generated/prisma`.
2. `prisma migrate deploy` — applies `prisma/migrations` to the SQLite database.
3. `npm run seed` — loads the demo college, 25 students, 64 platform accounts, friendships,
   groups, goals and rating history.
4. `npm run sync:contests` — pulls the live contest calendar from all four platform APIs.

### Demo logins

Password for every demo account is `campuscode123`.

| Email | Role |
| --- | --- |
| `aarav@campuscode.dev` | CampusCode admin, Class S |
| `ishita@campuscode.dev` | Class A |
| `kabir@campuscode.dev` | Class C beginner |

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm run start` | Production build and server |
| `npm run check` | `tsc --noEmit` + ESLint |
| `npm run db:migrate` | Create/apply a migration in development |
| `npm run seed` | Reset and reload the demo dataset |
| `npm run sync:contests` | Refresh the live contest calendar |
| `npm run smoke:platforms` | Live smoke test of all four platform adapters |
| `npm run smoke:app` | End-to-end HTTP smoke test (needs a running server) |
| `npm run setup` | generate → migrate → seed → sync |

## Platform adapters

Each adapter lives in `src/lib/platforms/` and implements the same contract: profile, rating
history and (where supported) contests.

| Platform | Profile source | Rating history |
| --- | --- | --- |
| Codeforces | `users.info` | `user.rating` |
| LeetCode | GraphQL `matchedUser` + `userContestRanking` | GraphQL `userContestRankingHistory` |
| CodeChef | public profile HTML | rating history table |
| AtCoder | profile HTML | embedded `rank_history` JSON |

Notes:

- **LeetCode** publishes a numeric *contest* rating through its public GraphQL API, which is what
  CampusCode reads. It is a contest metric, not a solution-count metric, and the platform exposes
  no other rating. The score uses the contest rating, the global rank position and the solved
  problem count as separate signals.
- Every number CampusCode shows comes from the platform. Nothing is estimated or filled in when a
  platform does not publish a value — the field stays empty instead.
- Requests are rate limited per host and failures are isolated: one platform being down never
  blocks a sync of the others.

## Scheduled jobs

Point a scheduler at these routes (add `Authorization: Bearer $CRON_SECRET` when
`CRON_SECRET` is set in the environment):

| Route | Recommended cadence |
| --- | --- |
| `POST /api/cron/sync-contests` | every 15 minutes |
| `POST /api/cron/sync-accounts` | every 6 hours (`?stale=true` for only stale accounts) |
| `POST /api/cron/reminders` | every 5 minutes |

## Data model

`prisma/schema.prisma` holds the full schema: users, colleges, departments, courses, linked
accounts, rating history, contests, contest participation, reminders, notifications, friendships,
groups, group challenges, goals, achievements, activity events, sessions and sync logs.

## Privacy

CampusCode stores only the public profile data exposed by each platform. Handles are only
fetched for accounts the student links themselves. Profiles can be hidden from the directory,
and `Settings → Delete account` removes the student, their linked accounts, rating history,
groups and sessions.
