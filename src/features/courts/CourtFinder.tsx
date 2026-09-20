"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Crosshair, MapPin, Clock, Search, ArrowUpRight } from "lucide-react";
import { ClubMap } from "./ClubMap";
import { Badge, Button, Card, EmptyState, Input } from "@/components/ui";
import { cn, distanceKm, formatClock, formatMoney } from "@/lib/format";
import type { Club } from "@/lib/types";

export interface ClubWithCourts extends Club {
  courtCount: number;
}

export function CourtFinder({ clubs }: { clubs: ClubWithCourts[] }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [me, setMe] = useState<{ lat: number; lng: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  function locate() {
    if (!navigator.geolocation) {
      setLocError("Your browser will not share a location.");
      return;
    }
    setLocating(true);
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMe({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      () => {
        setLocError("We could not get your location. Search by name instead.");
        setLocating(false);
      },
      { timeout: 8000 },
    );
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? clubs.filter(
          (c) =>
            c.name.toLowerCase().includes(q) ||
            c.city.toLowerCase().includes(q) ||
            (c.address ?? "").toLowerCase().includes(q),
        )
      : clubs;

    if (!me) return filtered;
    return [...filtered]
      .map((c) => ({ ...c, km: distanceKm(me, c) }))
      .sort((a, b) => a.km - b.km);
  }, [clubs, query, me]);

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search
            size={15}
            className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-bone-600"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clubs or sectors"
            aria-label="Search clubs"
            className="pl-11"
          />
        </div>
        <Button
          variant="outline"
          onClick={locate}
          disabled={locating}
          aria-label="Find clubs near me"
          className="shrink-0"
        >
          <Crosshair size={15} aria-hidden="true" />
          <span className="hidden sm:inline">{locating ? "Locating" : "Near me"}</span>
        </Button>
      </div>

      {locError ? (
        <p role="status" className="text-xs text-flag-amber">
          {locError}
        </p>
      ) : null}

      <Card className="overflow-hidden p-0">
        <ClubMap
          clubs={visible}
          selectedId={selected}
          onSelect={setSelected}
          me={me}
          className="h-[44vh] min-h-[280px] w-full md:h-[420px]"
        />
      </Card>

      {visible.length === 0 ? (
        <EmptyState
          icon={<MapPin size={30} strokeWidth={1.2} />}
          title="Nothing matches that"
          body="Try a different name, or clear the search to see every registered court."
          action={
            <Button variant="outline" onClick={() => setQuery("")}>
              Clear search
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {visible.map((club) => {
            const km = me ? distanceKm(me, club) : null;
            const isSelected = selected === club.id;
            return (
              <li key={club.id}>
                <Card className={cn("lift group h-full", isSelected && "border-gold-500/45")}>
                  <div className="flex h-full flex-col p-6">
                    <div className="flex items-start justify-between gap-4">
                      <button
                        type="button"
                        onClick={() => setSelected(club.id)}
                        className="min-w-0 text-left"
                      >
                        <span className="block font-display text-2xl leading-tight font-light text-bone-100 transition-colors duration-300 group-hover:text-gold-200">
                          {club.name}
                        </span>
                        <span className="mt-1.5 block truncate text-[0.65rem] tracking-[0.12em] text-bone-500 uppercase">
                          {club.address ?? club.city}
                        </span>
                      </button>

                      <span className="shrink-0 text-right">
                        <span className="block font-display text-lg leading-none text-gold-300 tabular-nums">
                          {formatMoney(club.price_per_hour_cents, club.currency)}
                        </span>
                        <span className="mt-1 block text-[0.55rem] tracking-[0.16em] text-bone-600 uppercase">
                          Per hour
                        </span>
                      </span>
                    </div>

                    <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-bone-500">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={12} strokeWidth={1.5} aria-hidden="true" />
                        {km !== null ? `${km.toFixed(1)} km` : club.city}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock size={12} strokeWidth={1.5} aria-hidden="true" />
                        {formatClock(club.opens_at)} – {formatClock(club.closes_at)}
                      </span>
                      <span>
                        {club.courtCount} court{club.courtCount === 1 ? "" : "s"}
                      </span>
                    </div>

                    {club.amenities.length > 0 ? (
                      <ul className="mt-4 flex flex-wrap gap-1.5">
                        {club.amenities.slice(0, 3).map((a) => (
                          <li key={a}>
                            <Badge>{a}</Badge>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="mt-auto flex items-center gap-4 pt-7">
                      <Link href={`/play?club=${club.id}`} className="flex-1">
                        <Button size="sm" className="w-full">
                          Find a game here
                        </Button>
                      </Link>
                      <Link
                        href={`/clubs/${club.slug}`}
                        className="inline-flex items-center gap-1 text-[0.66rem] font-medium tracking-[0.14em] text-bone-500 uppercase transition-colors duration-300 hover:text-gold-200"
                      >
                        Details
                        <ArrowUpRight size={13} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
