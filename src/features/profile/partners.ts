import type { Match } from "@/lib/types";

export interface PartnerStat {
  id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  level: number;
  played: number;
  won: number;
}

/**
 * Who you actually play with, and how often you win together.
 * Derived from completed matches only — a booked game proves nothing yet.
 */
export function partnerStats(matches: Match[], playerId: string): PartnerStat[] {
  const byId = new Map<string, PartnerStat>();

  for (const match of matches) {
    if (match.status !== "completed") continue;

    const me = match.players?.find((p) => p.player_id === playerId);
    if (!me) continue;

    const won = match.winning_team === me.team;

    for (const other of match.players ?? []) {
      if (other.player_id === playerId || other.team !== me.team || !other.profile) {
        continue;
      }
      const entry = byId.get(other.player_id) ?? {
        id: other.player_id,
        username: other.profile.username,
        full_name: other.profile.full_name,
        avatar_url: other.profile.avatar_url,
        level: other.profile.level,
        played: 0,
        won: 0,
      };
      entry.played += 1;
      if (won) entry.won += 1;
      byId.set(other.player_id, entry);
    }
  }

  return [...byId.values()].sort((a, b) => b.played - a.played || b.won - a.won);
}
