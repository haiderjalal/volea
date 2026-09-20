import Link from "next/link";
import { Handshake, MapPin } from "lucide-react";
import { Avatar, Badge, Card, EmptyState, SectionHeading, Stat } from "@/components/ui";
import { MatchCard } from "@/features/matches/MatchCard";
import { partnerStats } from "./partners";
import { levelLabel } from "@/lib/format";
import type { Match, Profile } from "@/lib/types";

const SIDE_LABEL = {
  left: "Left side",
  right: "Right side",
  both: "Either side",
} as const;

export function PlayerProfile({
  profile,
  matches,
  cityRank,
  children,
}: {
  profile: Profile;
  matches: Match[];
  cityRank?: number | null;
  /** Owner-only controls, rendered under the header. */
  children?: React.ReactNode;
}) {
  const partners = partnerStats(matches, profile.id).slice(0, 5);
  const played = profile.matches_played;
  const winPct = played > 0 ? Math.round((profile.matches_won / played) * 100) : 0;
  const recent = matches.filter((m) => m.status === "completed").slice(0, 5);

  return (
    <div className="space-y-8">
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <Avatar name={profile.full_name} src={profile.avatar_url} size={64} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-extrabold tracking-tight text-chalk-100">
              {profile.full_name}
            </h1>
            <p className="text-sm text-chalk-600">@{profile.username}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge tone="ball">
                Level {profile.level.toFixed(1)} · {levelLabel(profile.level)}
              </Badge>
              <Badge>{SIDE_LABEL[profile.preferred_side]}</Badge>
              {profile.city ? (
                <Badge>
                  <MapPin size={11} aria-hidden="true" />
                  {profile.city}
                </Badge>
              ) : null}
            </div>
          </div>
        </div>

        {profile.bio ? (
          <p className="mt-4 text-sm text-chalk-400">{profile.bio}</p>
        ) : null}

        {children ? <div className="mt-4">{children}</div> : null}
      </Card>

      <section>
        <SectionHeading title="Record" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Played" value={played} />
          <Stat label="Won" value={profile.matches_won} sub={`${winPct}% win rate`} />
          <Stat label="Level" value={profile.level.toFixed(1)} sub={levelLabel(profile.level)} />
          <Stat
            label={profile.city ? `${profile.city} rank` : "Rank"}
            value={cityRank ? `#${cityRank}` : "—"}
            sub={played === 0 ? "Play a match to rank" : undefined}
          />
        </div>
      </section>

      {partners.length > 0 ? (
        <section>
          <SectionHeading title="Regular partners" />
          <Card className="divide-y divide-court-700/60 p-0">
            <ul>
              {partners.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/players/${p.username}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-court-800/50"
                  >
                    <Avatar name={p.full_name} src={p.avatar_url} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-chalk-200">
                        {p.full_name}
                      </span>
                      <span className="block text-xs text-chalk-600">
                        {p.won} of {p.played} won together
                      </span>
                    </span>
                    <Badge tone={p.won * 2 >= p.played ? "teal" : "neutral"}>
                      {Math.round((p.won / p.played) * 100)}%
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      ) : null}

      <section>
        <SectionHeading title="Recent matches" />
        {recent.length === 0 ? (
          <EmptyState
            icon={<Handshake size={26} />}
            title="No completed matches"
            body="Results show up here once a match has been played and scored."
          />
        ) : (
          <ul className="space-y-3">
            {recent.map((m) => (
              <li key={m.id}>
                <MatchCard match={m} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
