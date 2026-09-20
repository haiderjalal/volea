import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { CourtFinder, type ClubWithCourts } from "@/features/courts/CourtFinder";
import { Reveal } from "@/components/Reveal";
import { Button, Card, EmptyState } from "@/components/ui";
import type { Club } from "@/lib/types";

export const metadata = {
  title: "Volea — find your fourth",
  description:
    "Private padel matchmaking across Islamabad and Rawalpindi. Name your hour; we assemble the four and reserve the court.",
  alternates: { canonical: "/" },
};

type ClubRow = Club & { courts: { count: number }[] };

/** Stagger helper — keeps the inline custom property readable at the call site. */
const delay = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

export default async function HomePage() {
  const supabase = await createClient();

  const [{ data: clubs, error }, { data: auth }] = await Promise.all([
    supabase.from("clubs").select("*, courts(count)").eq("status", "active").order("name"),
    supabase.auth.getUser(),
  ]);

  const withCounts: ClubWithCourts[] = ((clubs ?? []) as ClubRow[]).map((c) => ({
    ...c,
    courtCount: c.courts?.[0]?.count ?? 0,
  }));

  const courtTotal = withCounts.reduce((n, c) => n + c.courtCount, 0);
  const cities = new Set(withCounts.map((c) => c.city)).size;

  return (
    <div className="space-y-16">
      {!auth?.user ? (
        <section className="relative isolate overflow-hidden pt-6 pb-4 sm:pt-16">
          <p className="eyebrow rise" style={delay(0)}>
            Islamabad &middot; Rawalpindi
          </p>

          <h1
            className="rise mt-7 max-w-3xl font-display text-[3.25rem] leading-[0.95] font-light text-bone-100 sm:text-[5.5rem]"
            style={delay(90)}
          >
            Find your <span className="gold-text italic">fourth</span>.
          </h1>

          <p
            className="rise mt-8 max-w-xl text-base leading-relaxed text-bone-400 sm:text-lg"
            style={delay(180)}
          >
            Padel is played four at a time, and the fourth is always the problem. Name
            the hours you are free — say nine to eleven — and Volea assembles a group at
            your level and reserves the court.
          </p>

          <div className="rise mt-10 flex flex-wrap items-center gap-4" style={delay(270)}>
            <Link href="/signup">
              <Button size="lg">
                Request your profile
                <ArrowRight size={15} aria-hidden="true" />
              </Button>
            </Link>
            <Link href="/tournaments">
              <Button size="lg" variant="ghost">
                View tournaments
              </Button>
            </Link>
          </div>

          <hr className="hairline rise mt-16" style={delay(360)} aria-hidden="true" />

          <dl
            className="rise mt-8 grid grid-cols-3 gap-6 sm:max-w-xl"
            style={delay(420)}
          >
            {[
              { k: "Clubs", v: withCounts.length },
              { k: "Courts", v: courtTotal },
              { k: "Cities", v: cities },
            ].map((s) => (
              <div key={s.k}>
                <dd className="font-display text-4xl leading-none font-light text-bone-100 tabular-nums">
                  {s.v}
                </dd>
                <dt className="mt-2 text-[0.6rem] font-medium tracking-[0.2em] text-bone-600 uppercase">
                  {s.k}
                </dt>
              </div>
            ))}
          </dl>
        </section>
      ) : (
        <section className="rise flex flex-wrap items-end justify-between gap-6 pt-2">
          <div>
            <p className="eyebrow">The estate</p>
            <h1 className="mt-4 font-display text-4xl leading-none font-light text-bone-100 sm:text-5xl">
              Courts near you
            </h1>
          </div>
          <Link href="/play">
            <Button>
              Find a game
              <ArrowRight size={14} aria-hidden="true" />
            </Button>
          </Link>
        </section>
      )}

      {error ? (
        <Card className="border-flag-red/30 p-6">
          <p className="text-sm font-medium text-flag-red">Could not load courts.</p>
          <p className="mt-2 text-sm text-bone-500">
            The database may not be set up yet. Run{" "}
            <code className="text-bone-300">supabase/setup.sql</code> in the Supabase SQL
            Editor, then reload.
          </p>
        </Card>
      ) : withCounts.length === 0 ? (
        <EmptyState
          title="No clubs registered yet"
          body="Once a club lists its courts they appear here, on the map."
        />
      ) : (
        <Reveal>
          <CourtFinder clubs={withCounts} />
        </Reveal>
      )}
    </div>
  );
}
