import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { QueueForm } from "@/features/play/QueueForm";
import { WaitingRoom } from "@/features/play/WaitingRoom";
import { MatchCard } from "@/features/matches/MatchCard";
import { getPlayerMatches } from "@/features/matches/queries";
import { Button, Card, SectionHeading } from "@/components/ui";
import type { Club, Profile, QueueEntry } from "@/lib/types";

export const metadata = {
  title: "Find a game",
  description: "Tell Volea when you are free and get matched with players at your level.",
};

export default async function PlayPage({
  searchParams,
}: {
  searchParams: Promise<{ club?: string }>;
}) {
  const { club: clubParam } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // middleware redirects; this is just a type guard

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: profile }, { data: clubs }, { data: waiting }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
    supabase
      .from("clubs")
      .select("id, name, city")
      .eq("status", "active")
      .order("name")
      .returns<Pick<Club, "id" | "name" | "city">[]>(),
    supabase
      .from("queue_entries")
      .select("*")
      .eq("player_id", user.id)
      .eq("status", "waiting")
      .gte("play_date", today)
      .order("play_date")
      .limit(1)
      .maybeSingle<QueueEntry>(),
  ]);

  // Matches that have not been played yet, so the player knows where to turn up.
  const upcoming = await getPlayerMatches(supabase, user.id, { upcoming: true });

  let pulse = 0;
  if (waiting?.city) {
    const { data } = await supabase.rpc("queue_pulse", {
      p_play_date: waiting.play_date,
      p_city: waiting.city,
    });
    pulse = (data as number) ?? 0;
  }

  const waitingClub = waiting?.club_id
    ? (clubs?.find((c) => c.id === waiting.club_id)?.name ?? null)
    : null;

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <header>
        <h1 className="text-2xl font-extrabold tracking-tight text-chalk-100">
          {waiting ? "You are in the queue" : "Find a game"}
        </h1>
        <p className="mt-1 text-sm text-chalk-500">
          {waiting
            ? "Keep this page open — we will move you straight onto a court."
            : "Tell us when you are free. We handle the rest."}
        </p>
      </header>

      {waiting ? (
        <WaitingRoom entry={waiting} clubName={waitingClub} othersWaiting={pulse} />
      ) : (
        <QueueForm
          clubs={clubs ?? []}
          level={profile?.level ?? 2.0}
          defaultClubId={clubParam}
        />
      )}

      {upcoming.length > 0 ? (
        <section>
          <SectionHeading
            title="Your next games"
            action={
              <Link href="/matches" className="text-xs font-medium text-teal-400 hover:underline">
                All matches
              </Link>
            }
          />
          <ul className="space-y-3">
            {upcoming.map((m) => (
              <li key={m.id}>
                <MatchCard match={m} />
              </li>
            ))}
          </ul>
        </section>
      ) : !waiting ? (
        <Card className="flex items-center gap-3 p-4">
          <CalendarDays size={18} className="shrink-0 text-chalk-600" aria-hidden="true" />
          <p className="text-sm text-chalk-500">
            No games booked yet. Join the queue above, or{" "}
            <Link href="/tournaments" className="font-medium text-teal-400 hover:underline">
              enter a tournament
            </Link>
            .
          </p>
        </Card>
      ) : null}

      {!waiting ? (
        <Card className="p-4">
          <h2 className="text-sm font-semibold text-chalk-200">How matching works</h2>
          <ol className="mt-3 space-y-2.5 text-sm text-chalk-500">
            <li className="flex gap-2.5">
              <span className="font-bold text-ball-400">1</span>
              You give a window — say 8pm to 11pm.
            </li>
            <li className="flex gap-2.5">
              <span className="font-bold text-ball-400">2</span>
              Volea waits for three more players whose windows overlap yours by at least
              90 minutes.
            </li>
            <li className="flex gap-2.5">
              <span className="font-bold text-ball-400">3</span>
              It books a free court, splits you into balanced teams and tells everyone
              where to be.
            </li>
          </ol>
          <div className="mt-4">
            <Link href="/">
              <Button size="sm" variant="ghost">
                Browse courts first
              </Button>
            </Link>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
