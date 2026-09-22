import { MATCH_SELECT } from "./MatchCard";
import type { createClient } from "@/lib/supabase/server";
import type { Match } from "@/lib/types";

/** Derived from the factory so this signature can never drift from it. */
type VoleaClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Matches a player appears in. Two round trips rather than one: `match_players`
 * is the join table, and PostgREST cannot filter a parent by a child column
 * without dropping the other players from the row.
 */
export async function getPlayerMatches(
  supabase: VoleaClient,
  playerId: string,
  opts: { upcoming?: boolean; limit?: number } = {},
): Promise<Match[]> {
  const { data: rows } = await supabase
    .from("match_players")
    .select("match_id")
    .eq("player_id", playerId);

  const ids = rows?.map((r) => r.match_id as string) ?? [];
  if (ids.length === 0) return [];

  let query = supabase.from("matches").select(MATCH_SELECT).in("id", ids);

  if (opts.upcoming) {
    query = query
      .eq("status", "scheduled")
      .gte("ends_at", new Date().toISOString())
      .order("starts_at", { ascending: true });
  } else {
    query = query.order("starts_at", { ascending: false });
  }

  if (opts.limit) query = query.limit(opts.limit);

  const { data } = await query.returns<Match[]>();
  return data ?? [];
}

/**
 * Matches at a club that have finished but carry no score. This is the club's
 * queue of work — until it is cleared, nobody in those matches has a level that
 * reflects reality.
 */
export async function getClubMatchesAwaitingResult(
  supabase: VoleaClient,
  clubId: string,
): Promise<Match[]> {
  const { data } = await supabase
    .from("matches")
    .select(MATCH_SELECT)
    .eq("club_id", clubId)
    .eq("status", "scheduled")
    .lt("ends_at", new Date().toISOString())
    .order("starts_at", { ascending: false })
    .limit(30)
    .returns<Match[]>();
  return data ?? [];
}

export interface MatchBuckets {
  upcoming: Match[];
  /** Played, but nobody has entered a score — these hold up everyone's rating. */
  awaiting: Match[];
  history: Match[];
}

/** Splits a player's matches by where they sit relative to now. */
export function partitionMatches(matches: Match[]): MatchBuckets {
  const now = Date.now();
  const scheduled = matches.filter((m) => m.status === "scheduled");

  return {
    upcoming: scheduled
      .filter((m) => new Date(m.ends_at).getTime() >= now)
      .sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at)),
    awaiting: scheduled.filter((m) => new Date(m.ends_at).getTime() < now),
    history: matches.filter((m) => m.status !== "scheduled"),
  };
}
