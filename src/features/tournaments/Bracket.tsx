import { Trophy } from "lucide-react";
import { advanceTeam } from "@/app/tournaments/actions";
import { Badge, Button, Card } from "@/components/ui";
import { cn } from "@/lib/format";
import type { TournamentMatch, TournamentTeam } from "@/lib/types";

function roundName(round: number, total: number): string {
  const fromEnd = total - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semi-finals";
  if (fromEnd === 2) return "Quarter-finals";
  return `Round ${round}`;
}

function TeamSlot({
  team,
  isWinner,
  decided,
  onAdvance,
}: {
  team: TournamentTeam | undefined;
  isWinner: boolean;
  decided: boolean;
  onAdvance?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-2",
        decided && !isWinner && "opacity-45",
      )}
    >
      {team?.seed ? (
        <span className="w-4 shrink-0 text-[10px] font-bold text-chalk-600 tabular-nums">
          {team.seed}
        </span>
      ) : (
        <span className="w-4 shrink-0" />
      )}
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-sm",
          team ? "text-chalk-200" : "text-chalk-600 italic",
          isWinner && "font-semibold text-ball-400",
        )}
      >
        {team?.name ?? "To be decided"}
      </span>
      {isWinner ? <Trophy size={13} className="shrink-0 text-ball-400" aria-label="Winner" /> : null}
      {onAdvance}
    </div>
  );
}

export function Bracket({
  matches,
  teams,
  slug,
  canReport,
}: {
  matches: TournamentMatch[];
  teams: TournamentTeam[];
  slug: string;
  canReport: boolean;
}) {
  const byId = new Map(teams.map((t) => [t.id, t]));
  const rounds = [...new Set(matches.map((m) => m.round))].sort((a, b) => a - b);
  const total = rounds.length;

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2">
      <div className="flex min-w-max gap-4">
        {rounds.map((round) => (
          <section key={round} className="w-60 shrink-0">
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-chalk-500 uppercase">
              {roundName(round, total)}
            </h3>
            <ul className="space-y-3">
              {matches
                .filter((m) => m.round === round)
                .sort((a, b) => a.slot - b.slot)
                .map((m) => {
                  const decided = Boolean(m.winner_team_id);
                  const bothPresent = Boolean(m.team1_id && m.team2_id);
                  return (
                    <li key={m.id}>
                      <Card className="divide-y divide-court-700/60 p-0">
                        {[m.team1_id, m.team2_id].map((teamId, i) => (
                          <TeamSlot
                            key={i}
                            team={teamId ? byId.get(teamId) : undefined}
                            isWinner={decided && m.winner_team_id === teamId}
                            decided={decided}
                            onAdvance={
                              canReport && !decided && bothPresent && teamId ? (
                                <form
                                  action={advanceTeam.bind(null, m.id, teamId, slug)}
                                  className="shrink-0"
                                >
                                  <Button
                                    type="submit"
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 px-2 text-[11px]"
                                  >
                                    Won
                                  </Button>
                                </form>
                              ) : null
                            }
                          />
                        ))}
                      </Card>
                    </li>
                  );
                })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}

export function ChampionBanner({ team }: { team: TournamentTeam }) {
  return (
    <Card className="border-ball-500/40 bg-ball-500/5 p-5 text-center">
      <Trophy size={26} className="mx-auto text-ball-400" aria-hidden="true" />
      <p className="mt-2 text-xs font-semibold tracking-wide text-chalk-500 uppercase">
        Champions
      </p>
      <p className="mt-1 text-lg font-extrabold text-chalk-100">{team.name}</p>
      <div className="mt-2 flex items-center justify-center gap-2">
        {team.player1 ? <Badge>{team.player1.full_name}</Badge> : null}
        {team.player2 ? <Badge>{team.player2.full_name}</Badge> : null}
      </div>
    </Card>
  );
}
