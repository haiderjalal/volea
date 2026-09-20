import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { Clock, MapPin, Phone, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ClubMapPanel } from "@/features/courts/ClubMapPanel";
import { Badge, Button, Card, SectionHeading, Stat } from "@/components/ui";
import { formatClock, formatMoney, formatSlot } from "@/lib/format";
import type { Club, Court, Tournament } from "@/lib/types";

async function loadClub(slug: string): Promise<Club | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clubs")
    .select("*")
    .eq("slug", slug)
    .maybeSingle<Club>();
  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const club = await loadClub(slug);
  if (!club) return { title: "Club not found" };

  const description =
    club.description ??
    `Padel courts at ${club.name} in ${club.city}. Open ${formatClock(
      club.opens_at,
    )} to ${formatClock(club.closes_at)}.`;

  return {
    title: club.name,
    description,
    alternates: { canonical: `/clubs/${club.slug}` },
    openGraph: { title: `${club.name} · Volea`, description, type: "website" },
  };
}

export default async function ClubPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const club = await loadClub(slug);
  if (!club) notFound();

  const supabase = await createClient();
  const [{ data: courts }, { data: tournaments }] = await Promise.all([
    supabase
      .from("courts")
      .select("*")
      .eq("club_id", club.id)
      .eq("is_active", true)
      .order("name")
      .returns<Court[]>(),
    supabase
      .from("tournaments")
      .select("*")
      .eq("club_id", club.id)
      .in("status", ["open", "locked", "live"])
      .order("starts_at")
      .returns<Tournament[]>(),
  ]);

  const indoor = (courts ?? []).filter((c) => c.indoor).length;

  // Schema.org so the club can surface as a real place in search results.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: club.name,
    description: club.description ?? undefined,
    address: {
      "@type": "PostalAddress",
      streetAddress: club.address ?? undefined,
      addressLocality: club.city,
      addressCountry: club.country ?? undefined,
    },
    geo: { "@type": "GeoCoordinates", latitude: club.lat, longitude: club.lng },
    telephone: club.phone ?? undefined,
    openingHours: `Mo-Su ${club.opens_at.slice(0, 5)}-${club.closes_at.slice(0, 5)}`,
    sport: "Padel",
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="text-xs text-bone-600">
        <Link href="/" className="hover:text-bone-300">
          Courts
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-bone-400">{club.name}</span>
      </nav>

      <header>
        <h1 className="font-display text-4xl font-light text-bone-100">
          {club.name}
        </h1>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-bone-500">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} aria-hidden="true" />
            {club.address ? `${club.address}, ${club.city}` : club.city}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={14} aria-hidden="true" />
            {formatClock(club.opens_at)} – {formatClock(club.closes_at)}
          </span>
          {club.phone ? (
            <a
              href={`tel:${club.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-1.5 hover:text-court-400"
            >
              <Phone size={14} aria-hidden="true" />
              {club.phone}
            </a>
          ) : null}
        </p>

        {club.description ? (
          <p className="mt-3 text-sm text-bone-400">{club.description}</p>
        ) : null}

        {club.amenities.length > 0 ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {club.amenities.map((a) => (
              <li key={a}>
                <Badge>{a}</Badge>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-5">
          <Link href={`/play?club=${club.id}`}>
            <Button size="lg">Find a game here</Button>
          </Link>
        </div>
      </header>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Courts" value={courts?.length ?? 0} sub={indoor > 0 ? `${indoor} indoor` : "All outdoor"} />
        <Stat
          label="Per hour"
          value={formatMoney(club.price_per_hour_cents, club.currency)}
        />
        <Stat label="Per slot" value={formatMoney(Math.round(club.price_per_hour_cents * 1.5), club.currency)} sub="90 minutes" />
      </div>

      <Card className="overflow-hidden p-0">
        <ClubMapPanel club={club} />
      </Card>

      {tournaments && tournaments.length > 0 ? (
        <section>
          <SectionHeading title="Tournaments here" />
          <Card className="divide-y divide-ink-700/60 p-0">
            <ul>
              {tournaments.map((t) => (
                <li key={t.id}>
                  <Link
                    href={`/tournaments/${t.slug}`}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-800/50"
                  >
                    <Trophy size={16} className="shrink-0 text-gold-300" aria-hidden="true" />
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
        </section>
      ) : null}
    </div>
  );
}
