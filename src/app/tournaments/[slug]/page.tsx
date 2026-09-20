import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { CalendarDays, MapPin, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Bracket, ChampionBanner } from "@/features/tournaments/Bracket";
import { JoinTournament } from "@/features/tournaments/JoinTournament";
import { drawBracket } from "@/app/tournaments/actions";
import { Avatar, Badge, Button, Card, EmptyState, SectionHeading } from "@/components/ui";
import { formatMoney, formatSlot } from "@/lib/format";
import type { Tournament, TournamentMatch, TournamentTeam } from "@/lib/types";

const TEAM_SELECT = `
  *,
  player1:profiles!tournament_teams_player1_id_fkey(id, username, full_name, avatar_url, level),
  player2:profiles!tournament_teams_player2_id_fkey(id, username, full_name, avatar_url, level)
` as const;

type Row = Tournament & {
  club: { id: string; name: string; slug: string; city: string; owner_id: string } | null;
};

async function loadTournament(slug: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tournaments")
    .select("*, club:clubs(id, name, slug, city, owner_id)")
    .eq("slug", slug)
    .maybeSingle<Row>();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const t = await loadTournament(slug);
  if (!t) return { title: "Tournament not found" };

  return {
    title: t.name,
    description:
      t.description ??
      `A ${t.size}-team knockout padel tournament at ${t.club?.name ?? "a Volea club"}.`,
    alternates: { canonical: `/tournaments/${t.slug}` },
    openGraph: { title: `${t.name} · Volea`, description: t.description ?? undefined },
  };
}

export default async function TournamentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const tournament = await loadTournament(slug);
  if (!tournament) notFound();

  const supabase = await createClient();
  const [{ data: auth }, { data: teams }, { data: bracket }] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("tournament_teams")
      .select(TEAM_SELECT)
      .eq("tournament_id", tournament.id)
      .order("seed", { nullsFirst: false })
      .returns<TournamentTeam[]>(),
    supabase
      .from("tournament_matches")
      .select("*")
      .eq("tournament_id", tournament.id)
      .order("round")
      .returns<TournamentMatch[]>(),
  ]);

  const userId = auth?.user?.id ?? null;
  const allTeams = teams ?? [];
  const matches = bracket ?? [];

  const isHost = Boolean(userId && tournament.club?.owner_id === userId);
  const myTeam = allTeams.find(
    (t) => t.player1_id === userId || t.player2_id === userId,
  );
  const champion = tournament.champion_team_id
    ? allTeams.find((t) => t.id === tournament.champion_team_id)
    : undefined;

  const full = allTeams.length >= tournament.size;
  const canEnter =
    Boolean(userId) &&
    !myTeam &&
    tournament.status === "open" &&
    !full &&
    new Date(tournament.registration_closes_at) > new Date();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-chalk-100">
              {tournament.name}
            </h1>
            {tournament.club ? (
              <Link
                href={`/clubs/${tournament.club.slug}`}
                className="mt-1 inline-flex items-center gap-1.5 text-sm text-chalk-500 hover:text-teal-400"
              >
                <MapPin size={13} aria-hidden="true" />
                {tournament.club.name} · {tournament.club.city}
              </Link>
            ) : null}
          </div>
          <Badge tone="teal" className="capitalize">
            {tournament.status}
          </Badge>
        </div>

        {tournament.description ? (
          <p className="mt-3 text-sm text-chalk-400">{tournament.description}</p>
        ) : null}

        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm text-chalk-500">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={14} aria-hidden="true" />
            <dt className="sr-only">Starts</dt>
            <dd>{formatSlot(tournament.starts_at)}</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Users size={14} aria-hidden="true" />
            <dt className="sr-only">Entries</dt>
            <dd>
              {allTeams.length} of {tournament.size} teams
            </dd>
          </div>
          <div>
            <dt className="sr-only">Entry fee</dt>
            <dd className="font-semibold text-ball-400">
              {tournament.entry_fee_cents > 0
                ? `${formatMoney(tournament.entry_fee_cents, tournament.currency)} per team`
                : "Free entry"}
            </dd>
          </div>
        </dl>
      </header>

      {champion ? <ChampionBanner team={champion} /> : null}

      {canEnter ? (
        <JoinTournament tournamentId={tournament.id} mode={tournament.mode} />
      ) : myTeam ? (
        <Card className="border-teal-500/40 bg-teal-500/5 p-4">
          <p className="text-sm text-chalk-300">
            You are entered as <strong className="text-teal-400">{myTeam.name}</strong>
            {myTeam.seed ? ` · seed ${myTeam.seed}` : ""}.
          </p>
        </Card>
      ) : !userId ? (
        <Card className="p-4">
          <p className="text-sm text-chalk-400">
            <Link href="/login" className="font-semibold text-ball-400 hover:underline">
              Sign in
            </Link>{" "}
            to enter this tournament.
          </p>
        </Card>
      ) : null}

      {isHost && matches.length === 0 && allTeams.length >= 2 ? (
        <Card className="p-4">
          <p className="text-sm text-chalk-400">
            {allTeams.length} teams entered. Drawing the bracket seeds them by level and
            closes registration.
          </p>
          <form action={drawBracket.bind(null, tournament.id, tournament.slug)} className="mt-3">
            <Button type="submit">Draw the bracket</Button>
          </form>
        </Card>
      ) : null}

      <section>
        <SectionHeading title="Bracket" />
        {matches.length === 0 ? (
          <EmptyState
            title="The draw has not been made"
            body={`${allTeams.length} of ${tournament.size} teams entered. The host club seeds the bracket once entries close.`}
          />
        ) : (
          <Bracket
            matches={matches}
            teams={allTeams}
            slug={tournament.slug}
            canReport={isHost || Boolean(myTeam)}
          />
        )}
      </section>

      <section>
        <SectionHeading title={`Entries (${allTeams.length})`} />
        {allTeams.length === 0 ? (
          <EmptyState title="No teams yet" body="Be the first pair to enter." />
        ) : (
          <Card className="divide-y divide-court-700/60 p-0">
            <ul>
              {allTeams.map((team) => (
                <li key={team.id} className="flex items-center gap-3 px-4 py-3">
                  {team.seed ? (
                    <span className="w-5 shrink-0 text-center text-xs font-bold text-chalk-600 tabular-nums">
                      {team.seed}
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-chalk-100">
                      {team.name}
                    </span>
                    <span className="block truncate text-xs text-chalk-600">
                      {[team.player1?.full_name, team.player2?.full_name]
                        .filter(Boolean)
                        .join(" & ")}
                    </span>
                  </span>
                  <span className="flex shrink-0 -space-x-2">
                    {[team.player1, team.player2].filter(Boolean).map((p) => (
                      <Avatar
                        key={p!.id}
                        name={p!.full_name}
                        src={p!.avatar_url}
                        size={28}
                        className="ring-2 ring-court-850"
                      />
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
