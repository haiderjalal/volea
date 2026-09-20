import Link from "next/link";
import { ArrowRight, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CourtFinder, type ClubWithCourts } from "@/features/courts/CourtFinder";
import { Button, Card, EmptyState } from "@/components/ui";
import type { Club } from "@/lib/types";

export const metadata = {
  title: "Volea — find your fourth",
  description:
    "Every registered padel court on one map. Tell Volea when you are free and it finds three players at your level.",
  alternates: { canonical: "/" },
};

type ClubRow = Club & { courts: { count: number }[] };

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: clubs, error }, { data: auth }] = await Promise.all([
    supabase
      .from("clubs")
      .select("*, courts(count)")
      .eq("status", "active")
      .order("name"),
    supabase.auth.getUser(),
  ]);

  const withCounts: ClubWithCourts[] = ((clubs ?? []) as ClubRow[]).map((c) => ({
    ...c,
    courtCount: c.courts?.[0]?.count ?? 0,
  }));

  return (
    <div className="space-y-8">
      {!auth?.user ? (
        <section className="relative overflow-hidden rounded-card border border-court-700/70 bg-court-850/60 px-6 py-10 sm:px-10 sm:py-14">
          <p className="text-xs font-semibold tracking-[0.2em] text-teal-400 uppercase">
            Padel matchmaking
          </p>
          <h1 className="mt-3 max-w-xl text-3xl leading-[1.1] font-extrabold tracking-tight text-chalk-100 sm:text-5xl">
            Find your fourth.
          </h1>
          <p className="mt-4 max-w-lg text-base text-chalk-300 sm:text-lg">
            Stop chasing a group chat. Tell Volea the window you are free — say 8pm to
            11pm — and it matches you with three players at your level and puts you on a
            court.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/signup">
              <Button size="lg">
                Create your profile
                <ArrowRight size={18} aria-hidden="true" />
              </Button>
            </Link>
            <Link href="/tournaments">
              <Button size="lg" variant="outline">
                Browse tournaments
              </Button>
            </Link>
          </div>
          <p className="mt-5 inline-flex items-center gap-2 text-xs text-chalk-600">
            <Users size={14} aria-hidden="true" />
            Doubles fills at four players. Singles fills at two.
          </p>
        </section>
      ) : (
        <section className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-chalk-100">
              Courts near you
            </h1>
            <p className="mt-1 text-sm text-chalk-500">
              Pick a club, or let Volea choose one for you.
            </p>
          </div>
          <Link href="/play">
            <Button>
              Find a game
              <ArrowRight size={16} aria-hidden="true" />
            </Button>
          </Link>
        </section>
      )}

      {error ? (
        <Card className="border-flag-red/40 p-5">
          <p className="text-sm font-medium text-flag-red">Could not load courts.</p>
          <p className="mt-1 text-sm text-chalk-500">
            The database may not be set up yet. Run{" "}
            <code className="text-chalk-300">supabase/setup.sql</code> in the Supabase SQL
            Editor, then reload.
          </p>
        </Card>
      ) : withCounts.length === 0 ? (
        <EmptyState
          title="No clubs registered yet"
          body="Once a club registers its courts they appear here on the map."
        />
      ) : (
        <CourtFinder clubs={withCounts} />
      )}
    </div>
  );
}
