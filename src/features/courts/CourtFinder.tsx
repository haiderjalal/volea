"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Crosshair, MapPin, Clock, Search } from "lucide-react";
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
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-chalk-600"
            aria-hidden="true"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search clubs or areas"
            aria-label="Search clubs"
            className="pl-9"
          />
        </div>
        <Button
          variant="outline"
          onClick={locate}
          disabled={locating}
          aria-label="Find clubs near me"
          className="shrink-0"
        >
          <Crosshair size={16} aria-hidden="true" />
          <span className="hidden sm:inline">{locating ? "Locating…" : "Near me"}</span>
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
          className="h-[46vh] min-h-[260px] w-full md:h-[380px]"
        />
      </Card>

      {visible.length === 0 ? (
        <EmptyState
          icon={<MapPin size={28} />}
          title="No clubs match that"
          body="Try a different name, or clear the search to see every registered court."
          action={
            <Button variant="outline" onClick={() => setQuery("")}>
              Clear search
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {visible.map((club) => {
            const km = me ? distanceKm(me, club) : null;
            return (
              <li key={club.id}>
                <Card
                  className={cn(
                    "h-full transition-colors",
                    selected === club.id ? "border-teal-500/70" : "hover:border-court-600",
                  )}
                >
                  <div className="flex h-full flex-col p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => setSelected(club.id)}
                          className="text-left text-base font-semibold text-chalk-100 hover:text-ball-400"
                        >
                          {club.name}
                        </button>
                        <p className="mt-0.5 truncate text-sm text-chalk-500">
                          {club.address ?? club.city}
                        </p>
                      </div>
                      <Badge tone="ball" className="shrink-0">
                        {formatMoney(club.price_per_hour_cents, club.currency)}/hr
                      </Badge>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-chalk-500">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={13} aria-hidden="true" />
                        {km !== null ? `${km.toFixed(1)} km away` : club.city}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock size={13} aria-hidden="true" />
                        {formatClock(club.opens_at)} – {formatClock(club.closes_at)}
                      </span>
                      <span>
                        {club.courtCount} court{club.courtCount === 1 ? "" : "s"}
                      </span>
                    </div>

                    {club.amenities.length > 0 ? (
                      <ul className="mt-3 flex flex-wrap gap-1.5">
                        {club.amenities.slice(0, 3).map((a) => (
                          <li key={a}>
                            <Badge>{a}</Badge>
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="mt-4 flex gap-2 pt-1">
                      <Link href={`/play?club=${club.id}`} className="flex-1">
                        <Button size="sm" className="w-full">
                          Find a game here
                        </Button>
                      </Link>
                      <Link href={`/clubs/${club.slug}`}>
                        <Button size="sm" variant="outline">
                          Details
                        </Button>
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
