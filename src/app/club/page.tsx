import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PeakHours, RevenueTrend } from "@/features/club/Insights";
import { NewTournament } from "@/features/club/NewTournament";
import { CourtCalendar } from "@/features/courts/CourtCalendar";
import { MatchCard } from "@/features/matches/MatchCard";
import { ReportResult } from "@/features/matches/ReportResult";
import { getClubMatchesAwaitingResult } from "@/features/matches/queries";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  SectionHeading,
  Stat,
} from "@/components/ui";
import { formatMoney, formatSlot } from "@/lib/format";
import type { CalendarBooking, Club, ClubStats, Court, Tournament } from "@/lib/types";

export const metadata = {
  title: "Club dashboard",
  robots: { index: false, follow: false },
};

const RANGES = [7, 30, 90] as const;

type OwnerBooking = CalendarBooking & {
  players?: { profile: { full_name: string } | null }[];
};

function dateInZone(timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

export default async function ClubDashboard({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const { days: daysParam } = await searchParams;
  const days = RANGES.includes(Number(daysParam) as 7 | 30 | 90)
    ? Number(daysParam)
    : 30;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: club } = await supabase
    .from("clubs")
    .select("*")
    .eq("owner_id", user.id)
    .order("created_at")
    .limit(1)
    .maybeSingle<Club>();

  if (!club) {
    return (
      <div className="mx-auto max-w-lg py-8">
        <EmptyState
          icon={<Building2 size={30} />}
          title="You do not manage a club yet"
          body="Register your venue to appear on the map, take matchmade bookings and see how your courts are performing."
          action={
            <Link href="/club/new">
              <Button>Register your club</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const pending = await getClubMatchesAwaitingResult(supabase, club.id);

  const horizonDate = new Date();
  horizonDate.setUTCDate(horizonDate.getUTCDate() + 8);
  const horizon = horizonDate.toISOString();
  const [{ data: rawStats }, { data: courts }, { data: tournaments }, { data: bookingRows }] = await Promise.all([
    supabase.rpc("club_stats", { p_club_id: club.id, p_days: days }),
    supabase
      .from("courts")
      .select("*")
      .eq("club_id", club.id)
      .order("name")
      .returns<Court[]>(),
    supabase
      .from("tournaments")
      .select("*")
      .eq("club_id", club.id)
      .order("starts_at", { ascending: false })
      .returns<Tournament[]>(),
    supabase
      .from("matches")
      .select(`
        id, court_id, starts_at, ends_at, status, origin, booked_by,
        players:match_players(profile:profiles(full_name))
      `)
      .eq("club_id", club.id)
      .neq("status", "cancelled")
      .gte("ends_at", new Date().toISOString())
      .lt("starts_at", horizon)
      .order("starts_at")
      .returns<OwnerBooking[]>(),
  ]);

  const stats = rawStats as ClubStats | null;

  if (!stats) {
    return (
      <Card className="p-6">
        <p className="text-sm text-bone-400">We could not load this club&apos;s numbers.</p>
      </Card>
    );
  }

  const repeatRate =
    stats.unique_players > 0
      ? Math.round((stats.repeat_players / stats.unique_players) * 100)
      : 0;
  const calendarBookings: CalendarBooking[] = (bookingRows ?? []).map((booking) => ({
    ...booking,
    player_names: booking.players
      ?.map((player) => player.profile?.full_name)
      .filter((name): name is string => Boolean(name)),
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-4xl font-light text-bone-100">
            {club.name}
          </h1>
          <p className="mt-1 text-sm text-bone-500">
            {club.city} · {stats.courts} court{stats.courts === 1 ? "" : "s"} ·{" "}
            {formatMoney(club.price_per_hour_cents, club.currency)}/hour
          </p>
        </div>
        <Link href={`/clubs/${club.slug}`}>
          <Button variant="outline" size="sm">
            View public page
          </Button>
        </Link>
      </header>

      {pending.length > 0 ? (
        <section>
          <SectionHeading title={`Results to record (${pending.length})`} />
          <ul className="space-y-4">
            {pending.map((m) => (
              <li key={m.id}>
                <MatchCard match={m} action={<ReportResult matchId={m.id} />} />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-bone-600">
            Only you can record these. Players cannot score their own matches, and
            nobody&apos;s level moves until the result is in.
          </p>
        </section>
      ) : null}

      <section>
        <SectionHeading title="Booking calendar" />
        <CourtCalendar
          courts={courts ?? []}
          bookings={calendarBookings}
          opensAt={club.opens_at}
          closesAt={club.closes_at}
          timeZone={club.timezone}
          startDate={dateInZone(club.timezone)}
          clubSlug={club.slug}
          signedIn
          ownerView
        />
      </section>

      <nav aria-label="Date range" className="flex gap-2">
        {RANGES.map((r) => (
          <Link
            key={r}
            href={`/club?days=${r}`}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              days === r
                ? "bg-gold-500 text-ink-950"
                : "border border-ink-700 text-bone-400 hover:border-ink-600"
            }`}
          >
            {r} days
          </Link>
        ))}
      </nav>

      <section>
        <SectionHeading title="Performance" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat
            label="Revenue"
            value={formatMoney(stats.revenue_cents, stats.currency)}
            sub={`${stats.matches} booking${stats.matches === 1 ? "" : "s"}`}
          />
          <Stat
            label="Occupancy"
            value={`${stats.occupancy_pct}%`}
            sub={`${stats.hours_played} court hours`}
          />
          <Stat
            label="Players"
            value={stats.unique_players}
            sub={`${repeatRate}% came back`}
          />
          <Stat
            label="Scored"
            value={`${stats.completed}/${stats.matches}`}
            sub="Results reported"
          />
        </div>
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <PeakHours stats={stats} opensAt={club.opens_at} closesAt={club.closes_at} />
        <RevenueTrend stats={stats} />
      </div>

      <section>
        <SectionHeading title="Your regulars" />
        {stats.top_players.length === 0 ? (
          <EmptyState
            title="No players yet"
            body="Once Volea matches players onto your courts they show up here, most frequent first."
          />
        ) : (
          <Card className="divide-y divide-ink-700/60 p-0">
            <ul>
              {stats.top_players.map((p) => (
                <li key={p.username}>
                  <Link
                    href={`/players/${p.username}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-800/50"
                  >
                    <Avatar name={p.full_name} src={p.avatar_url} size={34} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-bone-200">
                        {p.full_name}
                      </span>
                      <span className="block text-xs text-bone-600">
                        last played {formatSlot(p.last_seen, club.timezone)}
                      </span>
                    </span>
                    <Badge tone="court">
                      {p.plays} visit{p.plays === 1 ? "" : "s"}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section>
        <SectionHeading title={`Courts (${courts?.length ?? 0})`} />
        <Card className="p-4">
          <ul className="flex flex-wrap gap-2">
            {(courts ?? []).map((c) => (
              <li key={c.id}>
                <Badge tone={c.is_active ? "neutral" : "red"}>
                  {c.name}
                  {c.indoor ? " · indoor" : ""}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section>
        <SectionHeading title="Tournaments" />
        <div className="space-y-3">
          {(tournaments ?? []).length > 0 ? (
            <Card className="divide-y divide-ink-700/60 p-0">
              <ul>
                {(tournaments ?? []).map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/tournaments/${t.slug}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-800/50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-bone-200">
                          {t.name}
                        </span>
                        <span className="block text-xs text-bone-600">
                          {formatSlot(t.starts_at, club.timezone)} · {t.size} teams
                        </span>
                      </span>
                      <Badge className="capitalize">{t.status}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
          <NewTournament clubId={club.id} currency={club.currency} />
        </div>
      </section>

      <p className="flex items-center gap-2 text-xs text-bone-600">
        <Plus size={13} aria-hidden="true" />
        Revenue is a snapshot taken when each match is booked, so changing your hourly
        price never rewrites past numbers.
      </p>
    </div>
  );
}
