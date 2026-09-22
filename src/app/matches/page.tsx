import Link from "next/link";
import { CalendarDays, MessageSquare } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getPlayerMatches, partitionMatches } from "@/features/matches/queries";
import { MatchCard } from "@/features/matches/MatchCard";
import { Button, EmptyState, SectionHeading } from "@/components/ui";
import type { Match } from "@/lib/types";

export const metadata = {
  title: "Your matches",
  description: "Every padel match you have booked and played on Volea.",
};

/** Every card routes to the match, where the group chat lives. */
function OpenMatch({ match }: { match: Match }) {
  return (
    <Link
      href={`/matches/${match.id}`}
      className="inline-flex items-center gap-1.5 text-[0.66rem] font-medium tracking-[0.14em] text-bone-500 uppercase transition-colors duration-300 hover:text-gold-200"
    >
      <MessageSquare size={13} aria-hidden="true" />
      Open chat
    </Link>
  );
}

export default async function MatchesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const matches = await getPlayerMatches(supabase, user.id);
  const { upcoming, awaiting, history } = partitionMatches(matches);

  return (
    <div className="mx-auto max-w-2xl space-y-10">
      <header>
        <h1 className="font-display text-4xl font-light text-bone-100">Your matches</h1>
        <p className="mt-1 text-sm text-bone-500">
          {matches.length === 0
            ? "Nothing here yet."
            : `${history.length} played · ${upcoming.length} coming up`}
        </p>
      </header>

      {upcoming.length > 0 ? (
        <section>
          <SectionHeading title="Coming up" />
          <ul className="space-y-4">
            {upcoming.map((m) => (
              <li key={m.id}>
                <MatchCard match={m} action={<OpenMatch match={m} />} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {awaiting.length > 0 ? (
        <section>
          <SectionHeading title="Awaiting a result" />
          <ul className="space-y-4">
            {awaiting.map((m) => (
              <li key={m.id}>
                <MatchCard match={m} action={<OpenMatch match={m} />} />
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-bone-600">
            {awaiting.length === 1 ? "This match is" : "These matches are"} with the host
            club. They record the score, which is what moves everyone&apos;s level.
          </p>
        </section>
      ) : null}

      {history.length > 0 ? (
        <section>
          <SectionHeading title="History" />
          <ul className="space-y-4">
            {history.map((m) => (
              <li key={m.id}>
                <MatchCard match={m} action={<OpenMatch match={m} />} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {matches.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={30} strokeWidth={1.2} />}
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
