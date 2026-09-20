import Link from "next/link";
import { MapPin, Clock, Trophy } from "lucide-react";
import { Avatar, Badge, Card, LevelChip } from "@/components/ui";
import { cn, formatMoney, formatSlot, scoreLine } from "@/lib/format";
import type { Match, MatchPlayer } from "@/lib/types";

function Team({
  players,
  won,
  label,
}: {
  players: MatchPlayer[];
  won: boolean | null;
  label: string;
}) {
  return (
    <div
      className={cn(
        "flex-1 rounded-xl border p-3",
        won === true
          ? "border-ball-500/50 bg-ball-500/5"
          : won === false
            ? "border-court-700 opacity-60"
            : "border-court-700",
      )}
    >
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-chalk-600">
        {label}
        {won === true ? (
          <Trophy size={12} className="text-ball-400" aria-label="Winners" />
        ) : null}
      </p>
      <ul className="space-y-2">
        {players.map((p) => (
          <li key={p.player_id}>
            <Link
              href={`/players/${p.profile?.username ?? ""}`}
              className="flex items-center gap-2 rounded-lg hover:bg-court-800/60"
            >
              <Avatar
                name={p.profile?.full_name ?? "Player"}
                src={p.profile?.avatar_url}
                size={28}
              />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-chalk-200">
                  {p.profile?.full_name ?? "Player"}
                </span>
              </span>
              {p.profile ? (
                <span className="shrink-0 text-xs font-bold text-ball-400">
                  {p.profile.level.toFixed(1)}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function MatchCard({
  match,
  action,
}: {
  match: Match;
  action?: React.ReactNode;
}) {
  const players = match.players ?? [];
  const team1 = players.filter((p) => p.team === 1);
  const team2 = players.filter((p) => p.team === 2);
  const done = match.status === "completed";
  const tz = match.club?.timezone ?? "Asia/Karachi";

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-chalk-100">
            <MapPin size={14} className="text-teal-400" aria-hidden="true" />
            {match.club?.name ?? "Club"}
            {match.court ? (
              <span className="font-normal text-chalk-500">· {match.court.name}</span>
            ) : null}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-chalk-500">
            <Clock size={12} aria-hidden="true" />
            {formatSlot(match.starts_at, tz)}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {match.origin === "tournament" ? <Badge tone="amber">Tournament</Badge> : null}
          {done ? (
            <Badge tone="ball">{scoreLine(match.score)}</Badge>
          ) : match.status === "cancelled" ? (
            <Badge tone="red">Cancelled</Badge>
          ) : (
            <Badge tone="teal">Scheduled</Badge>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-stretch gap-2">
        <Team
          players={team1}
          label="Team 1"
          won={done ? match.winning_team === 1 : null}
        />
        <span className="self-center text-xs font-bold text-chalk-600">vs</span>
        <Team
          players={team2}
          label="Team 2"
          won={done ? match.winning_team === 2 : null}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-court-700/70 pt-3">
        <span className="text-xs text-chalk-600">
          {match.price_total_cents > 0
            ? `${formatMoney(match.price_total_cents, match.currency)} · split ${
                players.length || 4
              } ways`
            : "Court booked"}
        </span>
        {action}
      </div>
    </Card>
  );
}

export const MATCH_SELECT = `
  *,
  club:clubs(id, name, slug, city, timezone),
  court:courts(id, name, indoor),
  players:match_players(
    match_id, player_id, team, rating_before, rating_after,
    profile:profiles(id, username, full_name, avatar_url, level)
  )
` as const;

export { LevelChip };
