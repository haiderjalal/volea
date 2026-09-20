import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPlayerMatches, partitionMatches } from "@/features/matches/queries";
import { MatchCard } from "@/features/matches/MatchCard";
import { ReportResult } from "@/features/matches/ReportResult";
import { Button, EmptyState, SectionHeading } from "@/components/ui";

export const metadata = {
  title: "Your matches",
  description: "Every padel match you have booked and played on Volea.",
};

export default async function MatchesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const matches = await getPlayerMatches(supabase, user.id);
  const { upcoming, awaiting, history } = partitionMatches(matches);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="font-display text-4xl font-light text-bone-100">
          Your matches
        </h1>
        <p className="mt-1 text-sm text-bone-500">
          {matches.length === 0
            ? "Nothing here yet."
            : `${history.length} played · ${upcoming.length} coming up`}
        </p>
      </header>

      {awaiting.length > 0 ? (
        <section>
          <SectionHeading title="Waiting on a score" />
          <ul className="space-y-3">
            {awaiting.map((m) => (
              <li key={m.id}>
                <MatchCard match={m} action={<ReportResult matchId={m.id} />} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {upcoming.length > 0 ? (
        <section>
          <SectionHeading title="Coming up" />
          <ul className="space-y-3">
            {upcoming.map((m) => (
              <li key={m.id}>
                <MatchCard match={m} action={<ReportResult matchId={m.id} />} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {history.length > 0 ? (
        <section>
          <SectionHeading title="History" />
          <ul className="space-y-3">
            {history.map((m) => (
              <li key={m.id}>
                <MatchCard match={m} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {matches.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={28} />}
          title="No matches yet"
          body="Join the queue and Volea will find you three players and a court."
          action={
            <Link href="/play">
              <Button>Find a game</Button>
            </Link>
          }
        />
      ) : null}
    </div>
  );
}
