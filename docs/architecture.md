# Architecture

## Shape

```
Browser
  ↓
Server Component  ──────────────┐
  ↓                             │ reads
Server Action / RPC             ↓
  ↓                      Supabase (RLS)
volea.* security-definer fn ──→ Postgres
```

Reads go straight from Server Components to Supabase under RLS. Writes that carry
business rules go through `security definer` Postgres functions. Nothing in
`src/app/` holds business logic.

## Why the rules live in Postgres

Matchmaking is a race. Four people can tap "find me a game" in the same second,
and the wrong design either double-books a court or hands the same partner to two
groups. `join_queue` does the whole thing in one transaction with
`FOR UPDATE SKIP LOCKED`, so concurrency is settled by the database rather than by
hope. Pushing it into application code would mean rebuilding locking on top of a
stateless serverless runtime.

The same argument holds for `report_match_result` (ratings must move atomically
with the result) and `generate_bracket` (seeding and byes must be one step).

| Function | Job |
| --- | --- |
| `join_queue` | Queue + match + court assignment + team seeding, atomically |
| `leave_queue` | Withdraw a waiting entry |
| `report_match_result` | Elo update across four players + settle the match |
| `join_tournament` | Entry with capacity, deadline and duplicate-partner checks |
| `generate_bracket` | Seed by level, build every round, walk over byes |
| `sync_bracket` | Propagate winners forward; crown the champion. Idempotent |
| `report_tournament_result` | Record a tie, then re-sync |
| `club_stats` | The whole owner dashboard in one round trip |
| `queue_pulse` | How many players are waiting, without leaking who |

## Matching, precisely

Overlap is the subtle part. Four players can each overlap each other pairwise and
still share no common window. The matcher therefore keeps a **running
intersection**: a candidate is accepted only if the intersection *after* adding
them still fits a 90-minute slot.

Club compatibility: two players conflict only if both pinned a club and the clubs
differ. If exactly one pinned a club, that club wins. If neither did, they must
share a city.

Level compatibility is two-way — your band must accept them *and* theirs must
accept you.

Teams are seeded strongest-with-weakest (1+4 vs 2+3). Random pairing produces
blowouts; this keeps games close, which is what keeps people coming back.

## Rating

Elo over team averages, K=32, surfaced as the padel 1.0–7.0 ladder players
actually speak in:

```
level = clamp(1.0 + (rating - 800) / 250, 1.0, 7.0)   rounded to nearest 0.5
```

`profiles.level` is a **generated column**, so it can never drift from `rating`.
Everyone starts at 1000 → level 2.0.

## Security

RLS is enabled on every table.

- `profiles`, `clubs`, `courts`, `matches`, `match_players`, `tournaments*` —
  publicly readable. Match history *is* the leaderboard and the profile.
- `queue_entries` — readable only by its owner. The matcher runs as definer and
  sees everything, so players never see who else is searching. `queue_pulse`
  returns a count, never identities.
- Clubs, courts and tournaments are writable only by the owning club.
- `matches` and `match_players` have **no write policy at all** — the only path in
  is through the definer functions.

The signup trigger on `auth.users` is wrapped in an exception handler. This
Supabase project is shared with another application, and a failure to create a
Volea profile must never block somebody else's signup.

## Schema isolation

Everything lives in `volea`, not `public`. The project already hosts an unrelated
application; a separate schema means no name collisions, no accidental writes, and
a clean lift into a dedicated project later (dump `volea`, restore, repoint).

Cost: the schema must be listed under Project Settings → API → Exposed schemas.

## Money

`matches.price_total_cents` is a **snapshot** taken when the match is booked, not
a join to the club's current price. An owner raising their hourly rate must not
rewrite last quarter's revenue.

## Client boundaries

Client components exist only where interaction demands them: the map, the queue
form and its waiting room, result reporting, profile and club forms. Everything
else is a Server Component. `ClubMapPanel` exists purely so the club page can stay
a Server Component while embedding an imperative map.

Leaflet is driven directly rather than through react-leaflet — the map is
imperative anyway, and this keeps it out of the SSR path without a dynamic-import
dance.

## Realtime

`volea.queue_entries` and `volea.matches` are in the `supabase_realtime`
publication. The waiting room subscribes to its own row and refreshes the instant
the matcher claims it. A 20-second poll sits behind it, because mobile sockets
drop and a stuck waiting screen is the one failure players will not forgive.
