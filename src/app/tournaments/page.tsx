import Link from "next/link";
import { Trophy, CalendarDays, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, EmptyState } from "@/components/ui";
import { formatMoney, formatSlot } from "@/lib/format";
import type { Tournament } from "@/lib/types";

export const metadata = {
  title: "Tournaments",
  description:
    "Knockout padel tournaments at clubs near you. Enter with a partner and play the bracket.",
  alternates: { canonical: "/tournaments" },
};

type Row = Tournament & {
  club: { id: string; name: string; slug: string; city: string } | null;
  teams: { count: number }[];
};

const STATUS_TONE = {
  open: "court",
  locked: "amber",
  live: "gold",
  completed: "neutral",
  draft: "neutral",
  cancelled: "red",
} as const;

export default async function TournamentsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("tournaments")
    .select("*, club:clubs(id, name, slug, city), teams:tournament_teams(count)")
    .in("status", ["open", "locked", "live", "completed"])
    .order("starts_at", { ascending: true })
    .returns<Row[]>();

  const tournaments = data ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="font-display text-4xl font-light text-bone-100">
          Tournaments
        </h1>
        <p className="mt-1 text-sm text-bone-500">
          Single-elimination knockouts hosted by clubs. Enter with a partner.
        </p>
      </header>

      {error || tournaments.length === 0 ? (
        <EmptyState
          icon={<Trophy size={28} />}
          title="No tournaments scheduled"
          body="Clubs post their knockouts here. Check back, or ask your club to host one."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {tournaments.map((t) => {
            const entered = t.teams?.[0]?.count ?? 0;
            return (
              <li key={t.id}>
                <Link href={`/tournaments/${t.slug}`} className="block h-full">
                  <Card className="h-full p-4 transition-colors hover:border-ink-600">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="font-display text-2xl font-light text-bone-100">{t.name}</h2>
                      <Badge tone={STATUS_TONE[t.status]} className="shrink-0 capitalize">
                        {t.status}
                      </Badge>
                    </div>

                    <p className="mt-1 text-sm text-bone-500">
                      {t.club?.name}
                      {t.club?.city ? ` · ${t.club.city}` : ""}
                    </p>

                    <dl className="mt-4 space-y-1.5 text-xs text-bone-500">
                      <div className="flex items-center gap-1.5">
                        <CalendarDays size={13} aria-hidden="true" />
                        <dt className="sr-only">Starts</dt>
                        <dd>{formatSlot(t.starts_at)}</dd>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users size={13} aria-hidden="true" />
                        <dt className="sr-only">Entries</dt>
                        <dd>
                          {entered} of {t.size} teams · {t.mode}
                        </dd>
                      </div>
                    </dl>

                    <p className="mt-4 text-sm font-semibold text-gold-300">
                      {t.entry_fee_cents > 0
                        ? `${formatMoney(t.entry_fee_cents, t.currency)} per team`
                        : "Free entry"}
                    </p>
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
