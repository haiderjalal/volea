<p align="center">
  <img src="public/brand/logomark.svg" width="72" alt="Volea" />
</p>

<h1 align="center">Volea</h1>
<p align="center"><strong>Find your fourth.</strong></p>

Padel matchmaking that actually fills the court. A player says when they are free —
"8pm to 11pm tonight" — and Volea finds three more players whose windows overlap,
picks a free court, splits everyone into balanced teams and books it.

Built because finding partners is the single biggest obstacle in padel: **47% of
players name it as their number one problem** ([2025 Padel Observatory, via
FourthPlayer](https://fourthplayer.io/)). Most apps solve booking *or* matchmaking
*or* ratings — never all three.

---

## What it does

**For players**
- Every registered court on a live map, sorted by distance
- Time-window matchmaking — doubles (4) or singles (2)
- Pin a club, or let Volea assign a free court
- Level filtering on the padel 1.0–7.0 ladder
- Knockout tournaments, seeded by level
- Profiles with your record, your regular partners and who you win with
- Regional and global leaderboards
- Realtime community room with online presence and seven-day message retention
- Public per-court calendars and collision-safe 90-minute reservations

**For club owners**
- Revenue, occupancy, court-hours and booking counts over 7 / 30 / 90 days
- A "when are my courts busy" chart that draws *every* open hour, so the dead
  slots worth discounting are the obvious ones
- Your regulars, ranked by visits, with last-seen dates
- Host tournaments and run the bracket
- A live seven-day court calendar with player names and every direct/matchmade booking
- Owner-only result entry, which automatically updates city and global rankings

## Stack

Next.js 16 (App Router, React 19, Turbopack) · TypeScript strict · Tailwind v4 ·
Supabase Postgres + Auth + Realtime · Leaflet + OpenStreetMap · Vercel

---

## Setup

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + publishable key
npm run dev
```

### Database

**Fastest path:** paste [`supabase/setup.sql`](supabase/setup.sql) into the
Supabase SQL Editor and run it once. The editor runs it as a single transaction,
so it either fully succeeds or leaves the database untouched — and the last block
drives four players through queue → match → court → result → rating and raises if
anything is wrong. A clean run is a verified install.

The bundle is generated, never hand-edited:

```bash
npm run db:bundle     # migrations/ + seed.sql + tests/ -> setup.sql
```

Sources, which are what you edit:

```
supabase/migrations/0001_init.sql     # tables, types, indexes
supabase/migrations/0002_engine.sql   # matchmaker, Elo, brackets, analytics, RLS
supabase/migrations/0005_community_bookings_and_owner_accounts.sql # chat, booking, presence
supabase/seed.sql                     # demo clubs and courts
supabase/tests/matchmaking.test.sql   # the self-check
```

Everything lives in `public`. Run the self-check any time against a dev database:

```bash
psql "$DATABASE_URL" -f supabase/tests/matchmaking.test.sql
```

It raises on failure and cleans up after itself, so a silent run is a pass.
The current suite exercises doubles and singles, pinned and automatic venues,
two-way level bands, incompatible club choices, overlapping reservations,
owner-only results, Elo updates and seven-day chat retention.

---

## How matching works

`volea.join_queue()` runs the whole thing in one transaction:

1. Insert the caller's queue row.
2. Scan waiting players on the same date and format whose window overlaps, whose
   club choice does not conflict, and whose level band satisfies *both* sides.
   Rows are taken `FOR UPDATE SKIP LOCKED` — two people tapping at the same
   instant can never claim the same partner.
3. Accept a candidate only if the running intersection still fits a 90-minute
   slot. Four compatible pairwise overlaps do not guarantee a shared window.
4. Pick a random free court at an open club with no conflicting booking.
5. Seed balanced teams — strongest with weakest (1+4 vs 2+3) — so games stay close.
6. Snapshot the price onto the match so later repricing never rewrites revenue.

Ratings are Elo over team averages (K=32), surfaced as the padel 1.0–7.0 level
players actually talk in. Everyone starts at 1000 → level 2.0.

## Architecture

```
src/app/         routes only — no business logic
src/features/    feature-owned UI (courts, play, matches, profile, tournaments, club)
src/components/  shared primitives and chrome
src/lib/         supabase clients, types, formatting
supabase/        migrations, seed, tests
```

Writes that carry business rules go through `security definer` Postgres functions
(`join_queue`, `report_match_result`, `join_tournament`, `generate_bracket`,
`club_stats`), never direct table writes. RLS is on for every table; queue rows
are private to their owner while the matcher, running as definer, sees them all.

## Design

Dark-only, on purpose: padel is a floodlit after-work sport. Colours are Tailwind
theme tokens (`court`, `ball`, `teal`, `chalk`) — never hardcode a hex in a
component. Mobile-first, with a bottom tab bar under `md` and a top nav above it.

## Known limits

- Club coordinates are entered by hand (lat/lng or "use my location"), not geocoded.
- A player can hold one queue slot per day.
- Tournament ties are reported as a winner without a set score.
